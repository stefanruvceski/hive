import { Stack } from 'expo-router';

import { HabitsYear } from '@/modules/habits/screens/year';

export default function HabitsYearRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Year', headerShown: false }} />
      <HabitsYear />
    </>
  );
}
