import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { moneyKeys } from './queries';
import {
  moneyEntries,
  moneyRecurring,
  moneyRates,
  type CategoryKind,
  type Frequency,
  type Space,
} from './schema';
import { toRsdMinor } from '../domain/amount';
import { newId } from '../domain/ids';
import { pickRate } from '../domain/rates';
import { missingOccurrences } from '../domain/recurring';

export type Rule = typeof moneyRecurring.$inferSelect;

export const recurringQuery = () =>
  queryOptions({
    queryKey: moneyKeys.recurring(),
    queryFn: async (): Promise<Rule[]> => getDb().select().from(moneyRecurring).all(),
  });

export function useRecurring() {
  return useQuery(recurringQuery());
}

export type RuleDraft = {
  id?: string;
  space: Space;
  kind: CategoryKind;
  amountMinor: number;
  currency: string;
  categoryId: string;
  note: string;
  frequency: Frequency;
  day: number;
  startDate: string;
};

export function useSaveRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rule }: RuleDraft) => {
      if (rule.amountMinor <= 0) throw new Error('A rule needs an amount.');
      const db = getDb();
      // Editing changes only what comes next: entries already created stay as they are.
      if (id)
        db.update(moneyRecurring)
          .set({ ...rule, note: rule.note.trim() })
          .where(eq(moneyRecurring.id, id))
          .run();
      else
        db.insert(moneyRecurring)
          .values({ id: newId(), ...rule, note: rule.note.trim() })
          .run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.recurring() }),
  });
}

/** Stops a rule from `endDate` on, or lets it run again (`null`). */
export function useStopRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, endDate }: { id: string; endDate: string | null }) => {
      getDb().update(moneyRecurring).set({ endDate }).where(eq(moneyRecurring.id, id)).run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.recurring() }),
  });
}

/**
 * Creates the entries every rule owes up to `today`. Idempotent: the (rule, day) pair is unique, so
 * running it twice, or on two screens at once, creates nothing twice. A foreign-currency rule waits
 * for a known rate rather than guessing one.
 */
export function useGenerateRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (today: string) => {
      const db = getDb();
      let created = 0;
      db.transaction((tx) => {
        const rates = tx.select().from(moneyRates).all();
        for (const rule of tx.select().from(moneyRecurring).all()) {
          const made = new Set(
            tx
              .select({ date: moneyEntries.date, recurringId: moneyEntries.recurringId })
              .from(moneyEntries)
              .where(eq(moneyEntries.recurringId, rule.id))
              .all()
              .map((row) => row.date),
          );
          for (const date of missingOccurrences(rule, made, today)) {
            const picked = pickRate(rates, rule.currency, date);
            if (!picked) continue;
            tx.insert(moneyEntries)
              .values({
                id: newId(),
                space: rule.space,
                kind: rule.kind,
                amountMinor: rule.amountMinor,
                currency: rule.currency,
                rate: picked.rate,
                amountRsdMinor: toRsdMinor(rule.amountMinor, picked.rate),
                categoryId: rule.categoryId,
                date,
                note: rule.note,
                recurringId: rule.id,
                createdAt: new Date().toISOString(),
              })
              .onConflictDoNothing()
              .run();
            created += 1;
          }
        }
      });
      return created;
    },
    onSuccess: (created) => {
      if (created > 0) {
        void queryClient.invalidateQueries({ queryKey: moneyKeys.entries() });
      }
    },
  });
}
