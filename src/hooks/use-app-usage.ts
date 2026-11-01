import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lt, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { homeAppUsage } from '@/lib/db/schema';
import { type AppUsageRow, oldestUsageDate } from '@/utils/app-usage';

export const appUsageKeys = {
  all: ['app-usage'] as const,
};

/** Opens per app and day; ranks the apps on Home's group cards and in a group folder. */
export const appUsageQuery = () =>
  queryOptions({
    queryKey: appUsageKeys.all,
    queryFn: async (): Promise<AppUsageRow[]> => getDb().select().from(homeAppUsage).all(),
  });

export function useAppUsage() {
  return useQuery(appUsageQuery());
}

/**
 * Counts one open of an app today and drops days that left the 30-day window. Fire and forget: the
 * app opens without waiting, and a failed count only leaves the ranking as it was.
 */
export function useRecordAppOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, today }: { moduleId: string; today: string }) => {
      getDb().transaction((tx) => {
        tx.insert(homeAppUsage)
          .values({ moduleId, date: today, opens: 1 })
          .onConflictDoUpdate({
            target: [homeAppUsage.moduleId, homeAppUsage.date],
            set: { opens: sql`${homeAppUsage.opens} + 1` },
          })
          .run();
        tx.delete(homeAppUsage)
          .where(lt(homeAppUsage.date, oldestUsageDate(today)))
          .run();
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: appUsageKeys.all }),
  });
}
