// The only place that talks to expo-notifications: permission, the Android channel, and
// scheduling the planned reminders (domain/reminders.ts decides what and when).
import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedReminder } from '../domain/reminders';

const channelId = 'habit-reminders';

// A reminder that arrives while Hive is open still shows as a banner.
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Android 8+ needs a channel before anything is shown (and before Android 13 asks permission). */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(channelId, {
    name: 'Habit reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function hasReminderPermission(): Promise<boolean> {
  return (await getPermissionsAsync()).granted;
}

/** Asks for permission if it was never asked; false when the user declines. */
export async function requestReminderPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await requestPermissionsAsync()).granted;
}

// Syncs never overlap: each waits for the one before it.
let queue: Promise<void> = Promise.resolve();

/** Replaces every scheduled reminder with `planned`. */
export function scheduleReminders(planned: readonly PlannedReminder[]): Promise<void> {
  queue = queue
    .catch(() => undefined)
    .then(async () => {
      await ensureChannel();
      await cancelAllScheduledNotificationsAsync();
      for (const { id, at, title, body } of planned) {
        await scheduleNotificationAsync({
          identifier: id,
          content: { title, body },
          trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId },
        });
      }
    });
  return queue;
}
