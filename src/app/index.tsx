import { Stack } from 'expo-router';

import { Home } from '@/screens/home';

export default function HomeRoute() {
  // Route-specific concerns only (params, titles). Screen UI lives in src/screens.
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Hive' }} />
      <Home />
    </>
  );
}
