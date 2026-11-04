import { Stack, useLocalSearchParams } from 'expo-router';

import { WalletReceiptScreen } from '@/modules/wallet/screens/receipt';

export default function WalletReceiptRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WalletReceiptScreen id={id} />
    </>
  );
}
