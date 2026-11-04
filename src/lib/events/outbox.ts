import { type HiveEvent, parseEvent, type StoredEvent } from './types';

/** Events older than this are deleted whether or not everyone read them (ADR 0003 §5). */
export const EVENT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const BATCH = 100;

/** What the outbox needs from storage; the Drizzle adapter is in `store.ts`, tests use a fake. */
export interface EventStore<TTx = undefined> {
  append(row: { type: string; version: number; payload: unknown; createdAt: number }): number;
  readAfter(afterId: number, limit: number): StoredEvent[];
  /** The consumer's cursor, or null when it is not registered. */
  cursor(consumer: string): number | null;
  setCursor(consumer: string, lastEventId: number): void;
  /** Smallest cursor over registered consumers, null with none. */
  minCursor(): number | null;
  deleteUpTo(id: number): void;
  deleteOlderThan(createdAt: number): void;
  /** Runs `fn` atomically; a throw rolls everything back. */
  transaction<T>(fn: (store: EventStore<TTx>, tx: TTx) => T): T;
}

/** Saves the event in the caller's transaction (`store` must be bound to it). */
export function appendEvent(store: EventStore<unknown>, event: HiveEvent, now = Date.now()) {
  return store.append({
    type: event.type,
    version: event.payload.version,
    payload: event.payload,
    createdAt: now,
  });
}

/**
 * Handles the events after the consumer's cursor, in id order, and moves the cursor — all in one
 * transaction per batch, so a throw re-delivers (handlers must be idempotent). Unknown events are
 * skipped. A first call registers the consumer before the first event still kept (replay).
 * Returns how many events were handled.
 */
export function consumeEvents<TTx>(
  store: EventStore<TTx>,
  consumer: string,
  handler: (event: HiveEvent, tx: TTx) => void,
  now = Date.now(),
): number {
  let handled = 0;
  for (;;) {
    const count = store.transaction((tx, raw) => {
      const cursor = tx.cursor(consumer) ?? 0;
      const batch = tx.readAfter(cursor, BATCH);
      for (const stored of batch) {
        const event = parseEvent(stored);
        if (event) {
          handler(event, raw);
          handled += 1;
        }
      }
      const last = batch.at(-1)?.id ?? cursor;
      tx.setCursor(consumer, last);
      return batch.length;
    });
    if (count < BATCH) break;
  }
  prune(store, now);
  return handled;
}

/**
 * The events `consumer` has not handled yet, without moving its cursor or registering it (a
 * consumer that is not registered would get everything still kept). Lets a consumer offer an
 * import before it commits to one.
 */
export function pendingEvents<TTx>(store: EventStore<TTx>, consumer: string): HiveEvent[] {
  const events: HiveEvent[] = [];
  let after = store.cursor(consumer) ?? 0;
  for (;;) {
    const batch = store.readAfter(after, BATCH);
    for (const stored of batch) {
      const event = parseEvent(stored);
      if (event) events.push(event);
    }
    after = batch.at(-1)?.id ?? after;
    if (batch.length < BATCH) return events;
  }
}

/** Deletes events everyone has read, and events older than 90 days. */
export function prune<TTx>(store: EventStore<TTx>, now = Date.now()) {
  store.transaction((tx) => {
    const min = tx.minCursor();
    if (min !== null) tx.deleteUpTo(min);
    tx.deleteOlderThan(now - EVENT_MAX_AGE_MS);
  });
}
