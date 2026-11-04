import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';

import { moneyKeys } from './queries';
import { moneyBudgets } from './schema';

export const budgetsQuery = () =>
  queryOptions({
    queryKey: moneyKeys.budgets(),
    queryFn: async () => getDb().select().from(moneyBudgets).all(),
  });

export function useBudgets() {
  return useQuery(budgetsQuery());
}

/** Sets a category's limit from a month on (0 removes it from then on); earlier months keep theirs. */
export function useSetBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: { categoryId: string; fromMonth: string; limitMinor: number }) => {
      getDb()
        .insert(moneyBudgets)
        .values(row)
        .onConflictDoUpdate({
          target: [moneyBudgets.categoryId, moneyBudgets.fromMonth],
          set: { limitMinor: row.limitMinor },
        })
        .run();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moneyKeys.budgets() }),
  });
}
