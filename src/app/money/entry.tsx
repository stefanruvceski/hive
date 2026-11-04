import { Stack, useLocalSearchParams } from 'expo-router';

import { MoneyEntry } from '@/modules/money/screens/entry';

export default function MoneyEntryRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit entry' : 'New entry', headerShown: false }} />
      <MoneyEntry id={id} />
    </>
  );
}
