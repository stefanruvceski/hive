import { Stack, useLocalSearchParams } from 'expo-router';

import { Customize } from '@/screens/customize';

export default function CustomizeRoute() {
  // Deep links are untrusted: `group` only picks which section to scroll to, and an id that no
  // group has is ignored.
  const { group } = useLocalSearchParams<{ group?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Customize Home' }} />
      <Customize focusGroup={typeof group === 'string' ? group : undefined} />
    </>
  );
}
