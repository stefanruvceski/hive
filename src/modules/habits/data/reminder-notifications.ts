// The only place that talks to expo-notifications: permission, the Android channel, and
// scheduling the planned reminders (domain/reminders.ts decides what and when).
import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  DEFAULT_ACTION_IDENTIFIER,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationChannelAsync,
  setNotificationHandler,
  useLastNotificationResponse,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { isReminderData, reminderData, type PlannedReminder } from '../domain/reminders';

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
          content: { title, body, data: reminderData },
          trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId },
        });
      }
    });
  return queue;
}

/**
 * Identifies the latest tap on a Habits reminder (also the one that launched the app), or null.
 * A new tap gives a new value, so the caller can act once per tap.
 */
export function useReminderTap(): string | null {
  const response = useLastNotificationResponse();
  if (!response || response.actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) return null;
  const { identifier, content } = response.notification.request;
  if (!isReminderData(content.data)) return null;
  return `${identifier}@${response.notification.date}`;
}
