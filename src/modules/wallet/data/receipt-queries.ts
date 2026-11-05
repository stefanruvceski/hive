import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { publish } from '@/lib/events';

import { fetchFiscal } from './fiscal-client';
import { walletKeys } from './queries';
import { walletReceiptItems, walletReceipts } from './schema';
import {
  emptyReceipt,
  receiptKey,
  type ReceiptData,
  verificationUrl,
} from '../domain/fiscal-parse';
import { newId } from '../domain/ids';
import { receiptPayload, repriced, type StoredItem, toStoredItem } from '../domain/receipt-events';
import { sortReceipts } from '../domain/receipt-stats';
import { outcome } from '../domain/receipt-sync';

type ReceiptRow = typeof walletReceipts.$inferSelect;
type ItemRow = typeof walletReceiptItems.$inferSelect;
export type ReceiptItem = ItemRow;
export type Receipt = ReceiptRow & { items: ItemRow[] };

export const receiptKeys = {
  all: () => [...walletKeys.all, 'receipts'] as const,
  list: () => [...receiptKeys.all(), 'list'] as const,
  detail: (id: string) => [...receiptKeys.all(), 'detail', id] as const,
  sync: () => [...receiptKeys.all(), 'sync'] as const,
};

const toStored = (i: ItemRow): StoredItem => ({
  name: i.name,
  quantity: i.quantity,
  unitPrice: i.unitPrice,
  total: i.total,
  unit: i.unit,
  vat: i.vat,
});

function load(id: string): Receipt | null {
  const db = getDb();
  const row = db.select().from(walletReceipts).where(eq(walletReceipts.id, id)).get();
  if (!row) return null;
  const items = db
    .select()
    .from(walletReceiptItems)
    .where(eq(walletReceiptItems.receiptId, id))
    .orderBy(asc(walletReceiptItems.position))
    .all();
  return { ...row, items };
}

export const receiptsQuery = () =>
  queryOptions({
    queryKey: receiptKeys.list(),
    queryFn: async (): Promise<Receipt[]> => {
      const db = getDb();
      const rows = db.select().from(walletReceipts).all();
      const items = db
        .select()
        .from(walletReceiptItems)
        .orderBy(asc(walletReceiptItems.position))
        .all();
      return sortReceipts(
        rows.map((r) => ({ ...r, items: items.filter((i) => i.receiptId === r.id) })),
      );
    },
  });

export const receiptQuery = (id: string) =>
  queryOptions({
    queryKey: receiptKeys.detail(id),
    queryFn: async (): Promise<Receipt | null> => load(id),
  });

export const useReceipts = () => useQuery(receiptsQuery());
export const useReceipt = (id: string) => useQuery(receiptQuery(id));

const asData = (r: ReceiptRow): ReceiptData => ({
  ...emptyReceipt,
  status: r.status,
  buyerTin: r.buyerTin,
  ownerManual: r.ownerManual,
  refund: r.refund,
});

const eventFor = (r: ReceiptRow, items: readonly StoredItem[]) => receiptPayload(r, items);

/**
 * Asks the tax office about one receipt and saves what comes back. When it becomes OK, the
 * receipt and its `receipt.scanned` event are saved in one transaction. Offline or an office
 * that is down leave it Pending.
 */
export async function syncReceipt(id: string): Promise<void> {
  const row = load(id);
  if (!row || row.status === 'ok') return;
  const result = outcome(asData(row), await fetchFiscal(row.url));
  if (result.kind === 'retry') return;
  const data = result.data;
  getDb().transaction((tx) => {
    tx.update(walletReceipts)
      .set({
        status: data.status,
        company: data.company,
        shop: data.shop,
        address: data.address,
        city: data.city,
        tin: data.tin,
        total: data.total === null ? null : Math.round(data.total * 100),
        time: data.time,
        invoiceNumber: data.invoiceNumber,
        refund: data.refund,
        payment: data.payment,
        journal: data.journal,
        error: data.error,
        buyerTin: data.buyerTin,
      })
      .where(eq(walletReceipts.id, id))
      .run();
    tx.delete(walletReceiptItems).where(eq(walletReceiptItems.receiptId, id)).run();
    const stored = data.items.map(toStoredItem);
    stored.forEach((item, position) => {
      tx.insert(walletReceiptItems)
        .values({ id: newId(), receiptId: id, position, ...item })
        .run();
    });
    if (data.status === 'ok') {
      const saved = tx.select().from(walletReceipts).where(eq(walletReceipts.id, id)).get();
      if (saved) publish(tx, { type: 'receipt.scanned', payload: eventFor(saved, stored) });
    }
  });
}

/** Pending and failed receipts are asked again when the Receipts tab opens and on pull to refresh. */
export const syncQuery = () =>
  queryOptions({
    queryKey: receiptKeys.sync(),
    staleTime: 0,
    queryFn: async (): Promise<number> => {
      const open = getDb()
        .select({ id: walletReceipts.id })
        .from(walletReceipts)
        .where(inArray(walletReceipts.status, ['pending', 'failed']))
        .all();
      for (const { id } of open) await syncReceipt(id);
      return open.length;
    },
  });

export function useSyncReceipts() {
  const queryClient = useQueryClient();
  const { refetch, isFetching } = useQuery(syncQuery());
  const refresh = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: receiptKeys.all() });
  };
  return { refresh, isRefreshing: isFetching };
}

export type AddResult = { id: string; duplicate: boolean };

/** Saves a scanned or pasted link at once as Pending, then fills it in; the same receipt twice is one. */
export function useAddReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string): Promise<AddResult> => {
      const url = verificationUrl(text);
      if (!url) throw new Error('This is not a Serbian fiscal receipt QR code.');
      const sourceKey = receiptKey(url);
      const db = getDb();
      const existing = db
        .select()
        .from(walletReceipts)
        .where(eq(walletReceipts.sourceKey, sourceKey))
        .get();
      if (existing) return { id: existing.id, duplicate: true };
      const id = newId();
      db.insert(walletReceipts).values({ id, url, sourceKey, addedAt: Date.now() }).run();
      return { id, duplicate: false };
    },
    onSuccess: async ({ id, duplicate }) => {
      await queryClient.invalidateQueries({ queryKey: receiptKeys.all() });
      if (duplicate) return;
      await syncReceipt(id);
      await queryClient.invalidateQueries({ queryKey: receiptKeys.all() });
    },
  });
}

function useInvalidating<TVars, TResult>(fn: (vars: TVars) => TResult) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TVars): Promise<TResult> => fn(vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: receiptKeys.all() }),
  });
}

/** The note: not part of what other modules read. */
export const useEditReceiptNote = () =>
  useInvalidating(({ id, note }: { id: string; note: string }) => {
    getDb()
      .update(walletReceipts)
      .set({ note: note.trim() })
      .where(eq(walletReceipts.id, id))
      .run();
  });

/** Who the receipt belongs to: a PIB, or null for personal. The choice survives a refetch. */
export const useSetReceiptOwner = () =>
  useInvalidating(({ id, buyerTin }: { id: string; buyerTin: string | null }) => {
    getDb().transaction((tx) => {
      tx.update(walletReceipts)
        .set({ buyerTin, ownerManual: true })
        .where(eq(walletReceipts.id, id))
        .run();
      const row = tx.select().from(walletReceipts).where(eq(walletReceipts.id, id)).get();
      if (row?.status !== 'ok') return;
      const items = tx
        .select()
        .from(walletReceiptItems)
        .where(eq(walletReceiptItems.receiptId, id))
        .orderBy(asc(walletReceiptItems.position))
        .all();
      publish(tx, { type: 'receipt.updated', payload: eventFor(row, items.map(toStored)) });
    });
  });

/** A corrected price or quantity; the line total follows. */
export const useEditReceiptItem = () =>
  useInvalidating(
    ({
      receiptId,
      itemId,
      quantity,
      unitPrice,
    }: {
      receiptId: string;
      itemId: string;
      quantity: number;
      unitPrice: number;
    }) => {
      getDb().transaction((tx) => {
        const item = tx
          .select()
          .from(walletReceiptItems)
          .where(eq(walletReceiptItems.id, itemId))
          .get();
        if (!item) return;
        const next = repriced(toStored(item), quantity, unitPrice);
        tx.update(walletReceiptItems)
          .set({ quantity: next.quantity, unitPrice: next.unitPrice, total: next.total })
          .where(eq(walletReceiptItems.id, itemId))
          .run();
        const row = tx.select().from(walletReceipts).where(eq(walletReceipts.id, receiptId)).get();
        if (row?.status !== 'ok') return;
        const items = tx
          .select()
          .from(walletReceiptItems)
          .where(eq(walletReceiptItems.receiptId, receiptId))
          .orderBy(asc(walletReceiptItems.position))
          .all();
        publish(tx, { type: 'receipt.updated', payload: eventFor(row, items.map(toStored)) });
      });
    },
  );

/** Takes one line off a receipt; consumers hear the receipt again without it. */
export const useDeleteReceiptItem = () =>
  useInvalidating(({ receiptId, itemId }: { receiptId: string; itemId: string }) => {
    getDb().transaction((tx) => {
      tx.delete(walletReceiptItems).where(eq(walletReceiptItems.id, itemId)).run();
      const row = tx.select().from(walletReceipts).where(eq(walletReceipts.id, receiptId)).get();
      if (row?.status !== 'ok') return;
      const items = tx
        .select()
        .from(walletReceiptItems)
        .where(eq(walletReceiptItems.receiptId, receiptId))
        .orderBy(asc(walletReceiptItems.position))
        .all();
      publish(tx, { type: 'receipt.updated', payload: eventFor(row, items.map(toStored)) });
    });
  });

/** Deletes the receipt and hands it back (with its items) so the caller can offer Undo. */
export const useDeleteReceipt = () =>
  useInvalidating((id: string): Receipt | null => {
    const snapshot = load(id);
    if (!snapshot) return null;
    getDb().transaction((tx) => {
      tx.delete(walletReceiptItems).where(eq(walletReceiptItems.receiptId, id)).run();
      tx.delete(walletReceipts).where(eq(walletReceipts.id, id)).run();
      if (snapshot.status === 'ok') {
        publish(tx, {
          type: 'receipt.deleted',
          payload: { version: 1, receiptId: id, sourceRef: snapshot.sourceKey },
        });
      }
    });
    return snapshot;
  });

/** Undo of a delete: the same rows come back, and consumers hear about the receipt again. */
export const useRestoreReceipt = () =>
  useInvalidating((snapshot: Receipt) => {
    const { items, ...row } = snapshot;
    getDb().transaction((tx) => {
      tx.insert(walletReceipts).values(row).onConflictDoNothing().run();
      for (const item of items)
        tx.insert(walletReceiptItems).values(item).onConflictDoNothing().run();
      if (row.status === 'ok') {
        publish(tx, { type: 'receipt.scanned', payload: eventFor(row, items.map(toStored)) });
      }
    });
  });

/** Asks the tax office again about one Pending or Failed receipt (the "Try again" button). */
export function useRetryReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => syncReceipt(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: receiptKeys.all() }),
  });
}
