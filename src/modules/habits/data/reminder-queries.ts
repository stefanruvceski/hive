import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';

import { habitsReminders } from './schema';
import { defaultReminders, type ReminderSetting } from '../domain/reminders';

// Hierarchical key factory — every key for this feature comes from here (07 §1).
export const reminderKeys = {
  all: ['habits', 'reminders'] as const,
  settings: () => [...reminderKeys.all, 'settings'] as const,
};

/** The reminder of each part of the day; a part never saved has its default time, off. */
export const reminderSettingsQuery = () =>
  queryOptions({
    queryKey: reminderKeys.settings(),
    queryFn: async (): Promise<ReminderSetting[]> => {
      const saved = new Map(
        getDb()
          .select()
          .from(habitsReminders)
          .all()
          .map((row) => [row.timeOfDay, row]),
      );
      return defaultReminders.map((fallback) => {
        const row = saved.get(fallback.timeOfDay);
        return row
          ? { ...fallback, enabled: row.enabled, hour: row.hour, minute: row.minute }
          : fallback;
      });
    },
  });

export function useReminderSettings() {
  return useQuery(reminderSettingsQuery());
}

/** Saves one part's reminder. Optimistic: the row changes at once and rolls back on error. */
export function useSaveReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (setting: ReminderSetting) => {
      const { enabled, hour, minute } = setting;
      getDb()
        .insert(habitsReminders)
        .values({ timeOfDay: setting.timeOfDay, enabled, hour, minute })
        .onConflictDoUpdate({ target: habitsReminders.timeOfDay, set: { enabled, hour, minute } })
        .run();
    },
    onMutate: async (setting) => {
      await queryClient.cancelQueries({ queryKey: reminderKeys.settings() });
      const previous = queryClient.getQueryData<ReminderSetting[]>(reminderKeys.settings());
      if (previous) {
        queryClient.setQueryData(
          reminderKeys.settings(),
          previous.map((item) => (item.timeOfDay === setting.timeOfDay ? setting : item)),
        );
      }
      return { previous };
    },
    onError: (_error, _setting, context) => {
      queryClient.setQueryData(reminderKeys.settings(), context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: reminderKeys.settings() }),
  });
}
