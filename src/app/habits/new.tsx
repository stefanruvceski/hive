import { Stack } from 'expo-router';

import { HabitsNew } from '@/modules/habits/screens/new';

export default function HabitsNewRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'New habit', headerShown: false }} />
      <HabitsNew />
    </>
  );
}
