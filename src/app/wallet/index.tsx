import { Stack } from 'expo-router';

import { WalletHome } from '@/modules/wallet/screens/home';

export default function WalletRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Wallet' }} />
      <WalletHome />
    </>
  );
}
