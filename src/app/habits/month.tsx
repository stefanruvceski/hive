import { Stack } from 'expo-router';

import { HabitsMonth } from '@/modules/habits/screens/month';

export default function HabitsMonthRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Month', headerShown: false }} />
      <HabitsMonth />
    </>
  );
}
