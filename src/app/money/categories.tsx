import { Stack } from 'expo-router';

import { MoneyCategories } from '@/modules/money/screens/categories';

export default function MoneyCategoriesRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Categories', headerShown: false }} />
      <MoneyCategories />
    </>
  );
}
