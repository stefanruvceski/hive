import { Stack } from 'expo-router';

import { HabitsArchived } from '@/modules/habits/screens/archived';

export default function HabitsArchivedRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Archived habits', headerShown: false }} />
      <HabitsArchived />
    </>
  );
}
