import { Stack, useLocalSearchParams } from 'expo-router';

import { MoneyRule } from '@/modules/money/screens/rule';

export default function MoneyRuleRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit rule' : 'New rule', headerShown: false }} />
      <MoneyRule id={id} />
    </>
  );
}
