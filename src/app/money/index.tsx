import { Stack } from 'expo-router';

import { MoneyHome } from '@/modules/money/screens/home';

export default function MoneyRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Money', headerShown: false }} />
      <MoneyHome />
    </>
  );
}
