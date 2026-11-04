import { asc, eq, gt, lt, lte, min } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { coreEventCursor, coreEvents } from '@/lib/db/schema';

import type { EventStore } from './outbox';
import type { StoredEvent } from './types';

type Db = ReturnType<typeof getDb>;
/** A Drizzle transaction (what `db.transaction` hands its callback). */
export type DbTx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Runner = Db | DbTx;

/** The outbox over a Drizzle database or transaction. */
export function drizzleEventStore(runner: Runner): EventStore<DbTx> {
  const store: EventStore<DbTx> = {
    append(row) {
      const inserted = runner
        .insert(coreEvents)
        .values({
          type: row.type,
          version: row.version,
          payload: JSON.stringify(row.payload),
          createdAt: row.createdAt,
        })
        .returning({ id: coreEvents.id })
        .get();
      return inserted.id;
    },
    readAfter(afterId, limit) {
      return runner
        .select()
        .from(coreEvents)
        .where(gt(coreEvents.id, afterId))
        .orderBy(asc(coreEvents.id))
        .limit(limit)
        .all()
        .map((r): StoredEvent => ({
          id: r.id,
          type: r.type,
          version: r.version,
          payload: JSON.parse(r.payload) as unknown,
          createdAt: r.createdAt,
        }));
    },
    cursor(consumer) {
      const row = runner
        .select()
        .from(coreEventCursor)
        .where(eq(coreEventCursor.consumer, consumer))
        .get();
      return row ? row.lastEventId : null;
    },
    setCursor(consumer, lastEventId) {
      runner
        .insert(coreEventCursor)
        .values({ consumer, lastEventId })
        .onConflictDoUpdate({ target: coreEventCursor.consumer, set: { lastEventId } })
        .run();
    },
    minCursor() {
      const row = runner
        .select({ value: min(coreEventCursor.lastEventId) })
        .from(coreEventCursor)
        .get();
      return row?.value ?? null;
    },
    deleteUpTo(id) {
      runner.delete(coreEvents).where(lte(coreEvents.id, id)).run();
    },
    deleteOlderThan(createdAt) {
      runner.delete(coreEvents).where(lt(coreEvents.createdAt, createdAt)).run();
    },
    transaction(fn) {
      return (runner as Db).transaction((tx) => fn(drizzleEventStore(tx), tx));
    },
  };
  return store;
}
