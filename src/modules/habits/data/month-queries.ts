import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, eq, gte, lte } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { habitsKeys } from './queries';
import { habitsCompletions } from './schema';
import { type Month, monthRange } from '../domain/month';
import { type Completion, setCompletion } from '../domain/streak';

// Under `habitsKeys.completions()`, so the existing "completions changed" invalidation also
// refreshes every month that was opened.
const monthKey = (month: Month) =>
  [...habitsKeys.completions(), 'month', month.year, month.month] as const;

/** The days habits were done within one month. */
export const monthCompletionsQuery = (month: Month) =>
  queryOptions({
    queryKey: monthKey(month),
    queryFn: async (): Promise<Completion[]> => {
      const { from, to } = monthRange(month);
      return getDb()
        .select()
        .from(habitsCompletions)
        .where(and(gte(habitsCompletions.date, from), lte(habitsCompletions.date, to)))
        .all();
    },
  });

export function useMonthCompletions(month: Month) {
  return useQuery(monthCompletionsQuery(month));
}

export type MonthCompletionChange = Completion & { done: boolean };

/**
 * Marks a habit done or not done on a day of the shown month. Optimistic: the cell changes at once
 * and rolls back if the write fails. Settling refreshes every completions query (streaks, Today).
 */
export function useSetMonthCompletion(month: Month) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date, done }: MonthCompletionChange) => {
      if (done) {
        getDb().insert(habitsCompletions).values({ habitId, date }).onConflictDoNothing().run();
      } else {
        getDb()
          .delete(habitsCompletions)
          .where(and(eq(habitsCompletions.habitId, habitId), eq(habitsCompletions.date, date)))
          .run();
      }
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.completions() });
      const previous = queryClient.getQueryData<Completion[]>(monthKey(month));
      if (previous) queryClient.setQueryData(monthKey(month), setCompletion(previous, change));
      return { previous };
    },
    onError: (_error, _change, context) => {
      queryClient.setQueryData(monthKey(month), context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsKeys.completions() }),
  });
}
