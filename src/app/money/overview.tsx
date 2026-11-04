import { Stack } from 'expo-router';

import { MoneyOverview } from '@/modules/money/screens/overview';

export default function MoneyOverviewRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Overview', headerShown: false }} />
      <MoneyOverview />
    </>
  );
}
