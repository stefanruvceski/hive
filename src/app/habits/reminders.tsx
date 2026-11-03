import { Stack } from 'expo-router';

import { HabitsReminders } from '@/modules/habits/screens/reminders';

export default function HabitsRemindersRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Reminders', headerShown: false }} />
      <HabitsReminders />
    </>
  );
}
