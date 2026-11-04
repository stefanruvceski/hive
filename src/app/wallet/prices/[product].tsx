import { Stack, useLocalSearchParams } from 'expo-router';

import { WalletProduct } from '@/modules/wallet/screens/product';

export default function WalletProductRoute() {
  const { product } = useLocalSearchParams<{ product: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WalletProduct productKey={product} />
    </>
  );
}
