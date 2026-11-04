import { Stack } from 'expo-router';

import { WalletCardNew } from '@/modules/wallet/screens/card-new';

export default function WalletCardNewRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WalletCardNew />
    </>
  );
}
