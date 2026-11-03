import { Stack } from 'expo-router';

import { HabitsBackup } from '@/modules/habits/screens/backup';

export default function HabitsBackupRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Backup', headerShown: false }} />
      <HabitsBackup />
    </>
  );
}
