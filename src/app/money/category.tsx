import { Stack, useLocalSearchParams } from 'expo-router';

import { MoneyCategory } from '@/modules/money/screens/category';

export default function MoneyCategoryRoute() {
  const { id, space } = useLocalSearchParams<{ id?: string; space?: string }>();
  return (
    <>
      <Stack.Screen
        options={{ title: id ? 'Edit category' : 'New category', headerShown: false }}
      />
      <MoneyCategory id={id} space={space === 'business' ? 'business' : 'private'} />
    </>
  );
}
