import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { KeyValueRow } from '@/components/ui/key-value-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';

import type { Entry } from '../../data/queries';
import { formatMinor } from '../../domain/amount';
import { receiptIdOf } from '../../domain/receipt-entries';
import { MoneyScreen } from '../components/money-screen';

/** An entry made from a Wallet receipt: shown, never edited here (it follows the receipt). */
export function ReceiptEntry({ entry, category }: { entry: Entry; category: string | null }) {
  const receiptId = receiptIdOf(entry.sourceRef);
  return (
    <MoneyScreen id="money-entry" title="Receipt item">
      <ThemedText themeColor="textSecondary" style={styles.note} testID="money-entry-readonly">
        Made from a Wallet receipt. Change it in Wallet and it follows.
      </ThemedText>
      <KeyValueRow label="Amount" value={formatMinor(entry.amountMinor, entry.currency)} />
      <KeyValueRow label="Date" value={entry.date} />
      <KeyValueRow label="Shop" value={entry.note} />
      {category ? <KeyValueRow label="Category" value={category} /> : null}
      {receiptId ? (
        <PrimaryButton
          label="Open receipt"
          onPress={() =>
            router.push({ pathname: '/wallet/receipt/[id]', params: { id: receiptId } })
          }
          testID="money-entry-open-receipt"
        />
      ) : null}
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({ note: { marginBottom: Spacing.two } });
