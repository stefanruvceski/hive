import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';
import { homeApps, homeGroups } from '@/lib/db/schema';
import { applyHomeEdit, type HomeEdit, HomeEditError, materializeHome } from '@/utils/home-edits';
import type { HomeRows } from '@/utils/home-groups';

export const homeLayoutKeys = {
  all: ['home-layout'] as const,
};

/** The user's Home arrangement: stored groups and where each app sits. Written by Customize (#31). */
export const homeLayoutQuery = () =>
  queryOptions({
    queryKey: homeLayoutKeys.all,
    queryFn: async (): Promise<HomeRows> => {
      const db = getDb();
      return {
        groups: db.select().from(homeGroups).all(),
        apps: db.select().from(homeApps).all(),
      };
    },
  });

export function useHomeLayout() {
  return useQuery(homeLayoutQuery());
}

type Modules = readonly { id: string; group: string }[];
type GroupDefaults = readonly { id: string; name: string }[];

/**
 * Saves one Customize edit (`src/utils/home-edits.ts`). The whole arrangement is written in one
 * transaction, so the first edit stores the registry defaults too and nothing moves on Home.
 * Optimistic: Home, the folder and Customize change at once, and roll back if the save fails or
 * the edit is refused (`HomeEditError`). `modules` and `defaultGroups` come from the registry,
 * which hooks may not import.
 */
export function useEditHome(modules: Modules, defaultGroups: GroupDefaults) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (edit: HomeEdit) => {
      getDb().transaction((tx) => {
        const stored: HomeRows = {
          groups: tx.select().from(homeGroups).all(),
          apps: tx.select().from(homeApps).all(),
        };
        const result = applyHomeEdit(materializeHome(modules, stored, defaultGroups), edit);
        if (!result.ok) throw new HomeEditError(result.reason);
        tx.delete(homeApps).run();
        tx.delete(homeGroups).run();
        if (result.rows.groups.length > 0) {
          tx.insert(homeGroups)
            .values([...result.rows.groups])
            .run();
        }
        if (result.rows.apps.length > 0) {
          tx.insert(homeApps)
            .values([...result.rows.apps])
            .run();
        }
      });
    },
    onMutate: async (edit) => {
      await queryClient.cancelQueries({ queryKey: homeLayoutKeys.all });
      const previous = queryClient.getQueryData<HomeRows>(homeLayoutKeys.all);
      if (previous) {
        const result = applyHomeEdit(materializeHome(modules, previous, defaultGroups), edit);
        if (result.ok) queryClient.setQueryData(homeLayoutKeys.all, result.rows);
      }
      return { previous };
    },
    onError: (_error, _edit, context) => {
      queryClient.setQueryData(homeLayoutKeys.all, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: homeLayoutKeys.all }),
  });
}
