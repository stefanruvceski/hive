import { Stack, useLocalSearchParams } from 'expo-router';

import { HabitsEdit } from '@/modules/habits/screens/edit';

export default function HabitsEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Edit habit', headerShown: false }} />
      <HabitsEdit id={id} />
    </>
  );
}
