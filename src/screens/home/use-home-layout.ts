import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';
import { homeModules } from '@/lib/db/schema';

import type { LayoutRow } from './home-layout';

export const homeLayoutKeys = {
  all: ['home-layout'] as const,
};

export const homeLayoutQuery = () =>
  queryOptions({
    queryKey: homeLayoutKeys.all,
    queryFn: async (): Promise<LayoutRow[]> => getDb().select().from(homeModules).all(),
  });

export function useHomeLayout() {
  return useQuery(homeLayoutQuery());
}

/** Replaces the stored layout. Optimistic: Home reorders instantly, rolls back if the write fails. */
export function useSaveHomeLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: LayoutRow[]) => {
      getDb().transaction((tx) => {
        tx.delete(homeModules).run();
        if (rows.length > 0) tx.insert(homeModules).values(rows).run();
      });
    },
    onMutate: async (rows) => {
      await queryClient.cancelQueries({ queryKey: homeLayoutKeys.all });
      const previous = queryClient.getQueryData<LayoutRow[]>(homeLayoutKeys.all);
      queryClient.setQueryData(homeLayoutKeys.all, rows);
      return { previous };
    },
    onError: (_error, _rows, context) => {
      queryClient.setQueryData(homeLayoutKeys.all, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: homeLayoutKeys.all }),
  });
}
