import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout, Spacing } from '@/constants/theme';

import { useReceiptSync } from '../../data/receipt-import';

/**
 * Keeps Money in step with Wallet's receipts. The first time, with receipts already scanned, it
 * asks before importing them; afterwards they arrive on their own and this shows nothing.
 */
export function ReceiptImport() {
  const { waiting, importNow, importing } = useReceiptSync();
  if (waiting === 0) return null;
  return (
    <GlassSurface
      kind="glass"
      radius={Layout.radius.list}
      style={styles.card}
      testID="money-import">
      <ThemedText>
        {waiting === 1 ? '1 scanned receipt is' : `${waiting} scanned receipts are`} waiting in
        Wallet.
      </ThemedText>
      <PrimaryButton
        label={`Import ${waiting} ${waiting === 1 ? 'receipt' : 'receipts'}`}
        disabled={importing}
        onPress={importNow}
        testID="money-import-receipts"
      />
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: Layout.listRow.paddingHorizontal, gap: Spacing.two },
});
