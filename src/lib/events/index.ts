import { getDb } from '@/lib/db/client';

import { appendEvent, consumeEvents } from './outbox';
import { type DbTx, drizzleEventStore } from './store';
import type { HiveEvent } from './types';

export type { HiveEvent, ReceiptEventItem, ReceiptPayloadV1 } from './types';
export type { DbTx } from './store';

const listeners = new Set<() => void>();

/** Called after a publish has been committed; pulling on app start/screen open stays the guarantee. */
export function onEvents(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Saves `event` in the caller's transaction `tx` (the one that saves the producer's data), so
 * both exist or neither does. Wakes listeners once the synchronous transaction has ended.
 */
export function publish(tx: DbTx, event: HiveEvent) {
  appendEvent(drizzleEventStore(tx), event);
  queueMicrotask(() => {
    for (const listener of listeners) listener();
  });
}

/** Handles the events this consumer has not seen; `handler` must be idempotent (ADR 0003). */
export function consume(consumer: string, handler: (event: HiveEvent, tx: DbTx) => void) {
  return consumeEvents(drizzleEventStore(getDb()), consumer, handler);
}
