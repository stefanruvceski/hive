import { Stack } from 'expo-router';

import { MoneyRate } from '@/modules/money/screens/rate';

export default function MoneyRateRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'New rate', headerShown: false }} />
      <MoneyRate />
    </>
  );
}
