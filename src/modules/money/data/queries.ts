import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import {
  type CategoryKind,
  type EntryKind,
  moneyCategories,
  moneyEntries,
  moneyItems,
  moneyPrefs,
  moneyRates,
  type Space,
  spaces,
} from './schema';
import { toRsdMinor } from '../domain/amount';
import { defaultCategories, normalizeName } from '../domain/categories';
import { newId } from '../domain/ids';
import type { ItemDraft } from '../domain/items';

export type Category = typeof moneyCategories.$inferSelect;
export type Entry = typeof moneyEntries.$inferSelect;
export type Item = typeof moneyItems.$inferSelect;

// Hierarchical key factory — every key for this module comes from here (07 §1).
export const moneyKeys = {
  all: ['money'] as const,
  view: () => [...moneyKeys.all, 'view'] as const,
  businesses: () => [...moneyKeys.all, 'businesses'] as const,
  categories: () => [...moneyKeys.all, 'categories'] as const,
  entries: () => [...moneyKeys.all, 'entries'] as const,
  items: () => [...moneyKeys.all, 'items'] as const,
  rates: () => [...moneyKeys.all, 'rates'] as const,
  budgets: () => [...moneyKeys.all, 'budgets'] as const,
  recurring: () => [...moneyKeys.all, 'recurring'] as const,
};

const viewKey = 'view';

/** The saved view choice (`all`, `private` or a business id), or null when none; see resolveView. */
export const activeViewQuery = () =>
  queryOptions({
    queryKey: moneyKeys.view(),
    queryFn: async (): Promise<string | null> =>
      getDb().select().from(moneyPrefs).where(eq(moneyPrefs.key, viewKey)).get()?.value ?? null,
  });

export function useActiveView() {
  return useQuery(activeViewQuery());
}

export function useSetView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (view: string) => {
      getDb()
        .insert(moneyPrefs)
        .values({ key: viewKey, value: view })
        .onConflictDoUpdate({ target: moneyPrefs.key, set: { value: view } })
        .run();
    },
    onMutate: (view) => queryClient.setQueryData(moneyKeys.view(), view),
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.view() }),
  });
}

/**
 * Every category of both spaces, archived ones included, in list order. The first read of an empty
 * table also writes the defaults (once; the table is then never empty again).
 */
export const categoriesQuery = () =>
  queryOptions({
    queryKey: moneyKeys.categories(),
    queryFn: async (): Promise<Category[]> => {
      const db = getDb();
      if (!db.select().from(moneyCategories).limit(1).get()) {
        db.transaction((tx) => {
          let position = 0;
          for (const space of spaces) {
            for (const category of defaultCategories[space]) {
              tx.insert(moneyCategories)
                .values({ id: newId(), space, position: position++, ...category })
                .run();
            }
          }
        });
      }
      return db.select().from(moneyCategories).orderBy(asc(moneyCategories.position)).all();
    },
  });

export function useCategories() {
  return useQuery(categoriesQuery());
}

export type CategoryDraft = {
  id?: string;
  space: Space;
  kind: CategoryKind;
  name: string;
  emoji: string;
};

/** Adds a category at the end, or renames/re-icons an existing one. */
export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, space, kind, name, emoji }: CategoryDraft) => {
      const clean = normalizeName(name);
      if (!clean) throw new Error('A category needs a name.');
      const db = getDb();
      if (id) {
        db.update(moneyCategories)
          .set({ name: clean, emoji })
          .where(eq(moneyCategories.id, id))
          .run();
        return;
      }
      const last = db.select().from(moneyCategories).orderBy(asc(moneyCategories.position)).all();
      const position = (last[last.length - 1]?.position ?? -1) + 1;
      db.insert(moneyCategories)
        .values({ id: newId(), space, kind, name: clean, emoji, position })
        .run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.categories() }),
  });
}

/** A category with entries is archived, never deleted: old entries keep their category. */
export function useArchiveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      getDb()
        .update(moneyCategories)
        .set({ archivedAt: archived ? new Date().toISOString().slice(0, 10) : null })
        .where(eq(moneyCategories.id, id))
        .run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.categories() }),
  });
}

export const entriesQuery = () =>
  queryOptions({
    queryKey: moneyKeys.entries(),
    queryFn: async (): Promise<Entry[]> => getDb().select().from(moneyEntries).all(),
  });

export function useEntries() {
  return useQuery(entriesQuery());
}

export const itemsQuery = () =>
  queryOptions({
    queryKey: moneyKeys.items(),
    queryFn: async (): Promise<Item[]> =>
      getDb().select().from(moneyItems).orderBy(asc(moneyItems.position)).all(),
  });

export function useItems() {
  return useQuery(itemsQuery());
}

export type EntryDraft = {
  /** Set when editing. */
  id?: string;
  space: Space;
  /** The business of a `business` entry; both halves of a payout carry the business it comes from. */
  businessId: string | null;
  kind: EntryKind;
  amountMinor: number;
  currency: string;
  rate: number;
  date: string;
  note: string;
  /** Null for a payout, or when the entry is split into items. */
  categoryId: string | null;
  items: ItemDraft[];
};

const payoutId = (pairId: string, space: Space) => `${pairId}:${space}`;

/** Everything that was removed, so an Undo can put it back. */
export type Removed = { entries: Entry[]; items: Item[] };

function invalidateEntries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: moneyKeys.entries() }),
    queryClient.invalidateQueries({ queryKey: moneyKeys.items() }),
    queryClient.invalidateQueries({ queryKey: moneyKeys.rates() }),
  ]);
}

/**
 * Saves an entry. A payout is written as two halves, one in each space, sharing a pair id; the
 * RSD value is fixed here, so totals never move when a rate changes later. A foreign rate that was
 * used is remembered as the rate of that day.
 */
export function useSaveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: EntryDraft) => {
      if (draft.amountMinor <= 0) throw new Error('An entry needs an amount.');
      const db = getDb();
      const amountRsdMinor = toRsdMinor(draft.amountMinor, draft.rate);
      const base = {
        kind: draft.kind,
        amountMinor: draft.amountMinor,
        currency: draft.currency,
        rate: draft.rate,
        amountRsdMinor,
        date: draft.date,
        note: draft.note.trim(),
      };
      db.transaction((tx) => {
        if (draft.kind === 'payout') {
          const existing = draft.id
            ? tx.select().from(moneyEntries).where(eq(moneyEntries.id, draft.id)).get()
            : undefined;
          const pairId = existing?.pairId ?? newId();
          for (const space of spaces) {
            const id = payoutId(pairId, space);
            const row = {
              ...base,
              id,
              space,
              businessId: draft.businessId,
              categoryId: null,
              pairId,
              createdAt: new Date().toISOString(),
            };
            tx.insert(moneyEntries)
              .values(row)
              .onConflictDoUpdate({
                target: moneyEntries.id,
                set: { ...base, businessId: row.businessId },
              })
              .run();
          }
        } else {
          const id = draft.id ?? newId();
          const row = {
            ...base,
            id,
            space: draft.space,
            businessId: draft.space === 'business' ? draft.businessId : null,
            categoryId: draft.items.length > 0 ? null : draft.categoryId,
            createdAt: new Date().toISOString(),
          };
          tx.insert(moneyEntries)
            .values(row)
            .onConflictDoUpdate({
              target: moneyEntries.id,
              set: {
                ...base,
                space: row.space,
                businessId: row.businessId,
                categoryId: row.categoryId,
              },
            })
            .run();
          tx.delete(moneyItems).where(eq(moneyItems.entryId, id)).run();
          draft.items.forEach((item, position) =>
            tx
              .insert(moneyItems)
              .values({ id: newId(), entryId: id, position, ...item })
              .run(),
          );
        }
        if (draft.currency !== 'RSD') {
          tx.insert(moneyRates)
            .values({
              currency: draft.currency,
              date: draft.date,
              rate: draft.rate,
              source: 'manual',
            })
            .onConflictDoNothing()
            .run();
        }
      });
    },
    onSettled: () => invalidateEntries(queryClient),
  });
}

/** Deletes an entry (both halves of a payout) and hands back what went, for Undo. */
export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Removed> => {
      const db = getDb();
      return db.transaction((tx) => {
        const entry = tx.select().from(moneyEntries).where(eq(moneyEntries.id, id)).get();
        if (!entry) return { entries: [], items: [] };
        const ids = entry.pairId
          ? tx
              .select()
              .from(moneyEntries)
              .where(eq(moneyEntries.pairId, entry.pairId))
              .all()
              .map((row) => row.id)
          : [id];
        const entries = tx.select().from(moneyEntries).where(inArray(moneyEntries.id, ids)).all();
        const items = tx.select().from(moneyItems).where(inArray(moneyItems.entryId, ids)).all();
        tx.delete(moneyItems).where(inArray(moneyItems.entryId, ids)).run();
        tx.delete(moneyEntries).where(inArray(moneyEntries.id, ids)).run();
        return { entries, items };
      });
    },
    onSettled: () => invalidateEntries(queryClient),
  });
}

/** Puts back what a delete removed (Undo). */
export function useRestoreEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entries, items }: Removed) => {
      getDb().transaction((tx) => {
        for (const entry of entries)
          tx.insert(moneyEntries).values(entry).onConflictDoNothing().run();
        for (const item of items) tx.insert(moneyItems).values(item).onConflictDoNothing().run();
      });
    },
    onSettled: () => invalidateEntries(queryClient),
  });
}

export const ratesQuery = () =>
  queryOptions({
    queryKey: moneyKeys.rates(),
    queryFn: async () => getDb().select().from(moneyRates).all(),
  });

export function useRates() {
  return useQuery(ratesQuery());
}

/** A rate typed by hand for a currency on a day. */
export function useSaveRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      currency,
      date,
      rate,
    }: {
      currency: string;
      date: string;
      rate: number;
    }) => {
      getDb()
        .insert(moneyRates)
        .values({ currency, date, rate, source: 'manual' })
        .onConflictDoUpdate({
          target: [moneyRates.currency, moneyRates.date],
          set: { rate, source: 'manual' },
        })
        .run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.rates() }),
  });
}
