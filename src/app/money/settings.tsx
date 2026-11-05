import { Stack } from 'expo-router';

import { MoneySettings } from '@/modules/money/screens/settings';

export default function MoneySettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Money settings', headerShown: false }} />
      <MoneySettings />
    </>
  );
}
