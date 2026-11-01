import { Stack } from 'expo-router';

import { HabitsHome } from '@/modules/habits/screens/home';

export default function HabitsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Habits', headerShown: false }} />
      <HabitsHome />
    </>
  );
}
