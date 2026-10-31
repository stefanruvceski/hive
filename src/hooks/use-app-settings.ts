import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import {
  type AppSettings,
  applySettingChange,
  parseAppSettings,
  type SettingChange,
  toSettingRow,
} from '@/utils/app-settings';

export const appSettingsKeys = {
  all: ['app-settings'] as const,
};

export const appSettingsQuery = () =>
  queryOptions({
    queryKey: appSettingsKeys.all,
    queryFn: async (): Promise<AppSettings> =>
      parseAppSettings(getDb().select().from(settings).all()),
  });

/** App-wide preferences (Settings). Shared by the root layout (appearance) and Settings. */
export function useAppSettings() {
  return useQuery(appSettingsQuery());
}

/** Saves one setting. Optimistic: the UI changes at once and rolls back if the write fails. */
export function useSetAppSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: SettingChange) => {
      const row = toSettingRow(change);
      getDb()
        .insert(settings)
        .values(row)
        .onConflictDoUpdate({ target: settings.key, set: { value: row.value } })
        .run();
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: appSettingsKeys.all });
      const previous = queryClient.getQueryData<AppSettings>(appSettingsKeys.all);
      if (previous) {
        queryClient.setQueryData(appSettingsKeys.all, applySettingChange(previous, change));
      }
      return { previous };
    },
    onError: (_error, _change, context) => {
      queryClient.setQueryData(appSettingsKeys.all, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: appSettingsKeys.all }),
  });
}
