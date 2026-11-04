import { Stack } from 'expo-router';

import { WalletPrices } from '@/modules/wallet/screens/prices';

export default function WalletPricesRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WalletPrices />
    </>
  );
}
