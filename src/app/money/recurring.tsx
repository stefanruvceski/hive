import { Stack } from 'expo-router';

import { MoneyRecurring } from '@/modules/money/screens/recurring';

export default function MoneyRecurringRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Recurring', headerShown: false }} />
      <MoneyRecurring />
    </>
  );
}
