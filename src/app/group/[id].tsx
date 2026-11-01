import { Stack, useLocalSearchParams } from 'expo-router';

import { GroupFolder } from '@/screens/group-folder';

export default function GroupFolderRoute() {
  // Deep links are untrusted: anything but a single id string shows the folder's "nothing here" state.
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Group' }} />
      <GroupFolder groupId={typeof id === 'string' ? id : ''} />
    </>
  );
}
