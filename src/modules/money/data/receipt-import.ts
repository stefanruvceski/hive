import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, eq, isNull, like } from 'drizzle-orm';
import { useEffect } from 'react';

import { consume, type DbTx, type HiveEvent, onEvents, pending } from '@/lib/events';

import { moneyKeys, seedCategories } from './queries';
import { moneyBusinesses, moneyCategories, moneyEntries, moneyItems, type Space } from './schema';
import { newId } from '../domain/ids';
import {
  categoryNameFor,
  planEvent,
  type ReceiptEntry,
  reconcile,
} from '../domain/receipt-entries';

// Wallet receipts become Money entries (issue #84, ADR 0003). Money is a consumer of the events
// outbox: it never imports Wallet. Handlers are idempotent through the unique `source_ref`.

const CONSUMER = 'money';
const SOURCE = 'wallet';

/** The business with this PIB, made if it is new; a returning one is brought back if archived. */
function ensureBusiness(tx: DbTx, pib: string): string {
  const existing = tx.select().from(moneyBusinesses).where(eq(moneyBusinesses.pib, pib)).get();
  if (existing) {
    if (existing.archivedAt) {
      tx.update(moneyBusinesses)
        .set({ archivedAt: null })
        .where(eq(moneyBusinesses.id, existing.id))
        .run();
    }
    return existing.id;
  }
  const id = newId();
  tx.insert(moneyBusinesses)
    .values({ id, name: `Business ${pib}`, pib, createdAt: new Date().toISOString() })
    .run();
  return id;
}

/** A live expense category of `space` called `name`, else "Other", else the first one. */
function categoryFor(tx: DbTx, space: Space, name: string): string | null {
  const live = tx
    .select()
    .from(moneyCategories)
    .where(
      and(
        eq(moneyCategories.space, space),
        eq(moneyCategories.kind, 'expense'),
        isNull(moneyCategories.archivedAt),
      ),
    )
    .all();
  const byName = (wanted: string) =>
    live.find((c) => c.name.toLowerCase() === wanted.toLowerCase());
  return (byName(name) ?? byName('Other') ?? live[0])?.id ?? null;
}

function write(tx: DbTx, receiptId: string, entries: readonly ReceiptEntry[]) {
  const existing = tx
    .select({ id: moneyEntries.id, sourceRef: moneyEntries.sourceRef })
    .from(moneyEntries)
    .where(like(moneyEntries.sourceRef, `wallet:${receiptId}:%`))
    .all();
  const { upsert, remove } = reconcile(existing, entries);
  for (const id of remove) {
    tx.delete(moneyItems).where(eq(moneyItems.entryId, id)).run();
    tx.delete(moneyEntries).where(eq(moneyEntries.id, id)).run();
  }
  if (upsert.length === 0) return;
  seedCategories(tx);
  for (const e of upsert) {
    const space: Space = e.pib ? 'business' : 'private';
    const row = {
      space,
      businessId: e.pib ? ensureBusiness(tx, e.pib) : null,
      kind: 'expense' as const,
      amountMinor: e.amountMinor,
      currency: 'RSD',
      rate: 1,
      amountRsdMinor: e.amountMinor,
      categoryId: categoryFor(tx, space, categoryNameFor(e.shop, space)),
      date: e.date,
      note: e.note,
    };
    tx.insert(moneyEntries)
      .values({
        id: newId(),
        ...row,
        createdAt: new Date().toISOString(),
        source: SOURCE,
        sourceRef: e.sourceRef,
      })
      .onConflictDoUpdate({ target: moneyEntries.sourceRef, set: row })
      .run();
  }
}

/** Applies one receipt event to Money's entries; running it twice changes nothing. */
export function applyReceiptEvent(event: HiveEvent, tx: DbTx) {
  const { receiptId, entries } = planEvent(event);
  write(tx, receiptId, entries);
}

export type ReceiptSyncState = {
  /** Money has not read the outbox yet. */
  registered: boolean;
  /** Scanned receipts waiting to be imported. */
  waiting: number;
};

function readState(): ReceiptSyncState {
  const { registered, events } = pending(CONSUMER);
  return { registered, waiting: events.filter((e) => e.type === 'receipt.scanned').length };
}

const syncStateQuery = () =>
  queryOptions({ queryKey: moneyKeys.receipts(), queryFn: async () => readState() });

function useRefresh() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [
        moneyKeys.receipts(),
        moneyKeys.entries(),
        moneyKeys.businesses(),
        moneyKeys.categories(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

/**
 * Keeps Money in step with Wallet. Once Money has read the outbox it follows every receipt event
 * as it happens and on each open; before that, the receipts already scanned are only offered
 * (`waiting`, `importNow`) — except when there are none, when Money just registers.
 */
export function useReceiptSync() {
  const refresh = useRefresh();
  const state = useQuery(syncStateQuery());
  const run = useMutation({
    mutationFn: async () => {
      consume(CONSUMER, applyReceiptEvent);
    },
    onSettled: refresh,
  });
  const { mutate } = run;
  const registered = state.data?.registered;
  const waiting = state.data?.waiting ?? 0;
  const ready = registered === true || (registered === false && waiting === 0);

  useEffect(() => {
    if (ready) mutate();
  }, [ready, mutate]);
  useEffect(
    () =>
      onEvents(() => {
        if (registered) mutate();
      }),
    [registered, mutate],
  );

  return {
    /** Receipts waiting for the user's yes; 0 when there is nothing to ask. */
    waiting: registered === false ? waiting : 0,
    importNow: () => mutate(),
    importing: run.isPending,
  };
}
