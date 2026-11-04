import { appendEvent, consumeEvents, EVENT_MAX_AGE_MS, type EventStore, prune } from './outbox';
import type { HiveEvent, ReceiptPayloadV1, StoredEvent } from './types';

/** In-memory store with real rollback, standing in for SQLite. */
function createFake() {
  const state = { events: [] as StoredEvent[], cursors: new Map<string, number>(), nextId: 1 };
  const store: EventStore = {
    append(row) {
      const id = state.nextId++;
      state.events.push({ ...row, id });
      return id;
    },
    readAfter: (afterId, limit) => state.events.filter((e) => e.id > afterId).slice(0, limit),
    cursor: (c) => state.cursors.get(c) ?? null,
    setCursor: (c, id) => void state.cursors.set(c, id),
    minCursor: () => (state.cursors.size ? Math.min(...state.cursors.values()) : null),
    deleteUpTo: (id) => void (state.events = state.events.filter((e) => e.id > id)),
    deleteOlderThan: (t) => void (state.events = state.events.filter((e) => e.createdAt >= t)),
    transaction(fn) {
      const snapshot = {
        events: [...state.events],
        cursors: new Map(state.cursors),
        nextId: state.nextId,
      };
      try {
        return fn(store, undefined);
      } catch (error) {
        state.events = snapshot.events;
        state.cursors = snapshot.cursors;
        state.nextId = snapshot.nextId;
        throw error;
      }
    },
  };
  return { state, store };
}

const payload = (id: string): ReceiptPayloadV1 => ({
  version: 1,
  receiptId: id,
  sourceRef: `vl-${id}`,
  shop: 'Shop',
  pib: null,
  total: 1000,
  currency: 'RSD',
  issuedAt: '2026-11-01T10:00:00Z',
  items: [],
});
const scanned = (id: string): HiveEvent => ({ type: 'receipt.scanned', payload: payload(id) });

describe('events outbox', () => {
  it('publishes with the producer data in one transaction: both exist or neither', () => {
    const { state, store } = createFake();
    const producerRows: string[] = [];
    expect(() =>
      store.transaction((tx) => {
        producerRows.push('row');
        appendEvent(tx, scanned('a'));
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(state.events).toHaveLength(0);
    store.transaction((tx) => {
      appendEvent(tx, scanned('a'));
    });
    expect(state.events).toHaveLength(1);
    expect(state.events[0]?.version).toBe(1);
  });

  it('re-delivers after a crash between handling and the cursor move', () => {
    const { state, store } = createFake();
    appendEvent(store, scanned('a'));
    appendEvent(store, scanned('b'));
    const seen: string[] = [];
    expect(() =>
      consumeEvents(store, 'money', (e) => {
        seen.push(e.payload.receiptId);
        if (e.payload.receiptId === 'b') throw new Error('crash');
      }),
    ).toThrow('crash');
    expect(state.cursors.get('money')).toBeUndefined();
    const again: string[] = [];
    consumeEvents(store, 'money', (e) => void again.push(e.payload.receiptId));
    expect(again).toEqual(['a', 'b']);
    expect(state.cursors.get('money')).toBe(2);
  });

  it('delivers each event once after the cursor moved', () => {
    const { store } = createFake();
    appendEvent(store, scanned('a'));
    const handler = jest.fn();
    expect(consumeEvents(store, 'money', handler)).toBe(1);
    expect(consumeEvents(store, 'money', handler)).toBe(0);
    appendEvent(store, scanned('b'));
    expect(consumeEvents(store, 'money', handler)).toBe(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('replays to a consumer registered after the events were published', () => {
    const { store } = createFake();
    consumeEvents(store, 'first', () => undefined);
    appendEvent(store, scanned('a'));
    appendEvent(store, scanned('b'));
    const late: string[] = [];
    consumeEvents(store, 'late', (e) => void late.push(e.payload.receiptId));
    expect(late).toEqual(['a', 'b']);
  });

  it('deletes an event once every registered consumer has read it', () => {
    const { state, store } = createFake();
    appendEvent(store, scanned('a'));
    consumeEvents(store, 'one', () => undefined);
    expect(state.events).toHaveLength(0);
    consumeEvents(store, 'two', () => undefined);
    appendEvent(store, scanned('b'));
    consumeEvents(store, 'one', () => undefined);
    expect(state.events).toHaveLength(1); // 'two' has not read b yet
    consumeEvents(store, 'two', () => undefined);
    expect(state.events).toHaveLength(0);
  });

  it('keeps events while no consumer is registered, but never past 90 days', () => {
    const { state, store } = createFake();
    const now = 1_000_000_000_000;
    appendEvent(store, scanned('old'), now - EVENT_MAX_AGE_MS - 1);
    appendEvent(store, scanned('new'), now - 1000);
    prune(store, now);
    expect(state.events.map((e) => e.payload)).toEqual([
      expect.objectContaining({ receiptId: 'new' }),
    ]);
  });

  it('skips unknown types and versions but moves the cursor', () => {
    const { state, store } = createFake();
    store.append({ type: 'receipt.scanned', version: 2, payload: { version: 2 }, createdAt: 1 });
    store.append({ type: 'other.thing', version: 1, payload: { version: 1 }, createdAt: 1 });
    appendEvent(store, scanned('a'));
    const handler = jest.fn();
    expect(consumeEvents(store, 'money', handler)).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(state.cursors.get('money')).toBe(3);
  });

  it('reads more than one batch', () => {
    const { store } = createFake();
    for (let i = 0; i < 250; i += 1) appendEvent(store, scanned(String(i)));
    expect(consumeEvents(store, 'money', () => undefined)).toBe(250);
  });
});
