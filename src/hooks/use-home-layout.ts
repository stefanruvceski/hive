import { queryOptions, useQuery } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';
import { homeApps, homeGroups } from '@/lib/db/schema';
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
