import { Stack, useLocalSearchParams } from 'expo-router';

import { MoneyBusiness } from '@/modules/money/screens/business';

export default function MoneyBusinessRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <>
      <Stack.Screen
        options={{ title: id ? 'Edit business' : 'New business', headerShown: false }}
      />
      <MoneyBusiness id={id} />
    </>
  );
}
