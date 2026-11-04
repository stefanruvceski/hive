import { Stack } from 'expo-router';

import { MoneyBusinesses } from '@/modules/money/screens/businesses';

export default function MoneyBusinessesRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Businesses', headerShown: false }} />
      <MoneyBusinesses />
    </>
  );
}
