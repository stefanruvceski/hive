import { Stack } from 'expo-router';

import { MoneyRates } from '@/modules/money/screens/rates';

export default function MoneyRatesRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Exchange rates', headerShown: false }} />
      <MoneyRates />
    </>
  );
}
