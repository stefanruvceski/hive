import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { coreBusinesses } from '@/lib/db/schema';
import { normalizePib } from '@/utils/pib';

// The businesses shared by Money and Wallet (ADR 0004): one list, one row per PIB.

export type BusinessRow = typeof coreBusinesses.$inferSelect;

export const businessKeys = {
  all: ['businesses'] as const,
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');

export const businessesQuery = () =>
  queryOptions({
    queryKey: businessKeys.all,
    queryFn: async (): Promise<BusinessRow[]> =>
      getDb().select().from(coreBusinesses).orderBy(asc(coreBusinesses.createdAt)).all(),
  });

export function useBusinesses() {
  return useQuery(businessesQuery());
}

/** The business with this PIB, or null. Spaces and dashes in `pib` are ignored. */
export function businessByPib<T extends { pib: string }>(
  rows: readonly T[] | undefined,
  pib: string | null,
): T | null {
  const clean = pib === null ? null : normalizePib(pib);
  if (clean === null) return null;
  return rows?.find((row) => row.pib === clean) ?? null;
}

export type BusinessDraft = { id?: string; name: string; pib: string };

/** The id of the business with this PIB, creating it when the PIB is new. Works inside a `tx`. */
export function ensureBusiness(
  db: Pick<ReturnType<typeof getDb>, 'select' | 'insert' | 'update'>,
  pib: string,
  name: string,
): string {
  const existing = db.select().from(coreBusinesses).where(eq(coreBusinesses.pib, pib)).get();
  if (existing) {
    // A returning business is brought back if it was archived; its name is never overwritten.
    if (existing.archivedAt) {
      db.update(coreBusinesses)
        .set({ archivedAt: null })
        .where(eq(coreBusinesses.id, existing.id))
        .run();
    }
    return existing.id;
  }
  const id = newId();
  db.insert(coreBusinesses).values({ id, name, pib, createdAt: new Date().toISOString() }).run();
  return id;
}

/** Adds a business, or edits one. A PIB that is already known is the same business, not a copy. */
export function useSaveBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, pib }: BusinessDraft): Promise<string> => {
      const name2 = cleanName(name);
      const cleanPib = normalizePib(pib);
      if (!name2 || !cleanPib) throw new Error('A business needs a name and a PIB.');
      if (!id) return ensureBusiness(getDb(), cleanPib, name2);
      const taken = getDb()
        .select()
        .from(coreBusinesses)
        .where(eq(coreBusinesses.pib, cleanPib))
        .get();
      if (taken && taken.id !== id) throw new Error('Another business has this PIB.');
      getDb()
        .update(coreBusinesses)
        .set({ name: name2, pib: cleanPib })
        .where(eq(coreBusinesses.id, id))
        .run();
      return id;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: businessKeys.all }),
  });
}

/** Finds the business a PIB belongs to and makes one if there is none yet (a scanned receipt). */
export function useEnsureBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pib, name }: { pib: string; name: string }): Promise<string> => {
      const clean = normalizePib(pib);
      const named = cleanName(name);
      if (!clean || !named) throw new Error('A business needs a name and a PIB.');
      return ensureBusiness(getDb(), clean, named);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: businessKeys.all }),
  });
}

/** A business with entries is archived, never deleted: old entries keep it. */
export function useArchiveBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      getDb()
        .update(coreBusinesses)
        .set({ archivedAt: archived ? new Date().toISOString().slice(0, 10) : null })
        .where(eq(coreBusinesses.id, id))
        .run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: businessKeys.all }),
  });
}
