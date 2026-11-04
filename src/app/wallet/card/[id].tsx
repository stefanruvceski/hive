import { Stack, useLocalSearchParams } from 'expo-router';

import { WalletCardScreen } from '@/modules/wallet/screens/card';

export default function WalletCardRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WalletCardScreen id={id} />
    </>
  );
}
