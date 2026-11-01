import { Stack, useLocalSearchParams } from 'expo-router';

import { GroupSheet } from '@/screens/group-sheet';

export default function GroupSheetRoute() {
  // Deep links are untrusted: anything but a single id string shows the sheet's "nothing here" state.
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Group' }} />
      <GroupSheet groupId={typeof id === 'string' ? id : ''} />
    </>
  );
}
