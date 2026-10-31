import { Stack } from 'expo-router';

import { Settings } from '@/screens/settings';

export default function SettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Settings />
    </>
  );
}
