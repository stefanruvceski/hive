import { useReminderSync } from '../../data/reminder-sync';

/** Renders nothing; keeps the scheduled reminders up to date (mounted in the root layout). */
export function HabitsReminderSync() {
  useReminderSync();
  return null;
}
