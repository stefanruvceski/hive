import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { moneyKeys } from './queries';
import { moneyBusinesses } from './schema';
import { normalizeName } from '../domain/categories';
import { newId } from '../domain/ids';
import { normalizePib } from '../domain/owners';

export type BusinessRow = typeof moneyBusinesses.$inferSelect;

export const businessesQuery = () =>
  queryOptions({
    queryKey: moneyKeys.businesses(),
    queryFn: async (): Promise<BusinessRow[]> =>
      getDb().select().from(moneyBusinesses).orderBy(asc(moneyBusinesses.createdAt)).all(),
  });

export function useBusinesses() {
  return useQuery(businessesQuery());
}

export type BusinessDraft = { id?: string; name: string; pib: string };

/** The id of the business with this PIB, creating it when the PIB is new (a scanned receipt). */
function ensure(pib: string, name: string): string {
  const db = getDb();
  const existing = db.select().from(moneyBusinesses).where(eq(moneyBusinesses.pib, pib)).get();
  if (existing) {
    // A returning business is brought back if it was archived; its name is never overwritten.
    if (existing.archivedAt) {
      db.update(moneyBusinesses)
        .set({ archivedAt: null })
        .where(eq(moneyBusinesses.id, existing.id))
        .run();
    }
    return existing.id;
  }
  const id = newId();
  db.insert(moneyBusinesses).values({ id, name, pib, createdAt: new Date().toISOString() }).run();
  return id;
}

/** Adds a business, or edits one. A PIB that is already known is the same business, not a copy. */
export function useSaveBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, pib }: BusinessDraft): Promise<string> => {
      const cleanName = normalizeName(name);
      const cleanPib = normalizePib(pib);
      if (!cleanName || !cleanPib) throw new Error('A business needs a name and a PIB.');
      if (!id) return ensure(cleanPib, cleanName);
      const taken = getDb()
        .select()
        .from(moneyBusinesses)
        .where(eq(moneyBusinesses.pib, cleanPib))
        .get();
      if (taken && taken.id !== id) throw new Error('Another business has this PIB.');
      getDb()
        .update(moneyBusinesses)
        .set({ name: cleanName, pib: cleanPib })
        .where(eq(moneyBusinesses.id, id))
        .run();
      return id;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.businesses() }),
  });
}

/**
 * Finds the business a PIB belongs to and makes one if there is none yet. This is what a scanned
 * receipt (Wallet) calls: the same PIB always lands on the same business.
 */
export function useEnsureBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pib, name }: { pib: string; name: string }): Promise<string> => {
      const cleanPib = normalizePib(pib);
      const cleanName = normalizeName(name);
      if (!cleanPib || !cleanName) throw new Error('A business needs a name and a PIB.');
      return ensure(cleanPib, cleanName);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.businesses() }),
  });
}

/** A business with entries is archived, never deleted: old entries keep it. */
export function useArchiveBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      getDb()
        .update(moneyBusinesses)
        .set({ archivedAt: archived ? new Date().toISOString().slice(0, 10) : null })
        .where(eq(moneyBusinesses.id, id))
        .run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.businesses() }),
  });
}
