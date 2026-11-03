import { router } from 'expo-router';
import { useEffect } from 'react';

import { useReminderTap } from '../../data/reminder-notifications';
import { useReminderSync } from '../../data/reminder-sync';

// Survives the component remounting: one tap opens Habits once.
let opened: string | null = null;

/**
 * Renders nothing; keeps the scheduled reminders up to date and opens Habits when a reminder is
 * tapped (mounted in the root layout).
 */
export function HabitsReminderSync() {
  useReminderSync();
  const tap = useReminderTap();

  useEffect(() => {
    if (!tap || tap === opened) return;
    opened = tap;
    router.push('/habits');
  }, [tap]);

  return null;
}
