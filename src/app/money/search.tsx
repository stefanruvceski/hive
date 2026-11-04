import { Stack } from 'expo-router';

import { MoneySearch } from '@/modules/money/screens/search';

export default function MoneySearchRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Search', headerShown: false }} />
      <MoneySearch />
    </>
  );
}
