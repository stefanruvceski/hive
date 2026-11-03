import { Stack } from 'expo-router';

import { HabitsMood } from '@/modules/habits/screens/mood';

export default function HabitsMoodRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Mood', headerShown: false }} />
      <HabitsMood />
    </>
  );
}
