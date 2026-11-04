import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useThemeName } from '@/hooks/use-theme';

import { useFullBrightness } from './use-full-brightness';
import { rememberDeletedCard } from '../../data/deleted-card';
import { useCard, useDeleteCard, useOpenCard, usePinCard } from '../../data/queries';
import { readable, spaced } from '../../domain/barcodes';
import { cardLook, maskedNumber } from '../../domain/card-brands';
import { cardColor } from '../../domain/card-colors';
import { type CardFormat, isCardFormat, isSquare } from '../../domain/card-format';
import { BarcodeView } from '../components/barcode-view';
import { CardFace } from '../components/card-face';
import { WalletScreen } from '../components/wallet-screen';

/** A card at the till: the code large on white, the number under it, full brightness. */
export function WalletCardScreen({ id }: { id: string }) {
  useFullBrightness();
  const scheme = useThemeName();
  const { data, error, isError, refetch } = useCard(id);
  const open = useOpenCard();
  const pin = usePinCard();
  const remove = useDeleteCard();

  // Opening a card counts as a use, once per visit.
  const counted = useRef(false);
  const found = data !== undefined && data !== null;
  useEffect(() => {
    if (found && !counted.current) {
      counted.current = true;
      open.mutate(id);
    }
  }, [found, id, open]);

  const confirmDelete = (name: string) =>
    Alert.alert(`Delete ${name}?`, 'You can undo this right after.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(id, {
            onSuccess: (row) => {
              rememberDeletedCard(row);
              router.back();
            },
          }),
      },
    ]);

  if (data) {
    const format: CardFormat = isCardFormat(data.format) ? data.format : 'CODE_128';
    return (
      <WalletScreen id="wallet-card" title={data.name}>
        <CardFace
          name={data.name}
          look={cardLook(data.name, cardColor(data.color, scheme))}
          detail={maskedNumber(data.number)}
          testID="wallet-card-face"
        />
        <BarcodeView number={data.number} format={format} testID="wallet-card-barcode" />
        {readable(data.number) && !isSquare(format) ? (
          <ThemedText type="number" style={styles.number} testID="wallet-card-number-text">
            {spaced(data.number, format)}
          </ThemedText>
        ) : null}
        {data.note ? <ThemedText type="hint">{data.note}</ThemedText> : null}
        <View style={styles.actions}>
          <PrimaryButton
            label={data.pinned ? 'Unpin' : 'Pin to top'}
            onPress={() => pin.mutate({ id, pinned: !data.pinned })}
            testID="wallet-card-pin"
          />
          <PrimaryButton
            label="Delete"
            onPress={() => confirmDelete(data.name)}
            testID="wallet-card-delete"
          />
        </View>
      </WalletScreen>
    );
  }
  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} testID="wallet-card-error" />;
  }
  if (data === null) {
    return <EmptyState title="Card not found" testID="wallet-card-missing" />;
  }
  return <LoadingState testID="wallet-card-loading" />;
}

const styles = StyleSheet.create({
  number: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' },
});
