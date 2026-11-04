import { Stack } from 'expo-router';

import { MoneyBudgets } from '@/modules/money/screens/budgets';

export default function MoneyBudgetsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Budgets', headerShown: false }} />
      <MoneyBudgets />
    </>
  );
}
