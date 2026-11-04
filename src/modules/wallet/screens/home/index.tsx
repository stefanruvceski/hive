import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useThemeName } from '@/hooks/use-theme';

import { rememberDeletedCard, useDeletedCard } from '../../data/deleted-card';
import { type WalletCard, useCards, useRestoreCard } from '../../data/queries';
import { spaced } from '../../domain/barcodes';
import { cardColor } from '../../domain/card-colors';
import { type CardFormat } from '../../domain/card-format';
import { UndoBar } from '../components/undo-bar';

const addCard = () => router.push('/wallet/card-new');

/** Wallet's entry screen: the loyalty cards. The Stack header shows the title (src/app/wallet/index.tsx). */
export function WalletHome() {
  const deleted = useDeletedCard();
  const restore = useRestoreCard();
  return (
    <Wallpaper style={styles.container} testID="wallet-screen">
      <WalletContent />
      {deleted ? (
        <UndoBar
          message={`${deleted.name} deleted`}
          onUndo={() => {
            restore.mutate(deleted);
            rememberDeletedCard(null);
          }}
          onDismiss={() => rememberDeletedCard(null)}
        />
      ) : null}
    </Wallpaper>
  );
}

// Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3).
function WalletContent() {
  const { data, error, isError, refetch } = useCards();

  if (data) {
    if (data.length === 0) {
      return (
        <EmptyState
          title="No cards yet"
          description="Keep your loyalty cards here and show their barcode at the till."
          action={<PrimaryButton label="Add card" onPress={addCard} testID="wallet-empty-add" />}
          testID="wallet-empty"
        />
      );
    }
    return (
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.add}>
            <PrimaryButton label="Add card" onPress={addCard} testID="wallet-add" />
          </View>
        }
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        testID="wallet-list"
      />
    );
  }
  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} testID="wallet-error" />;
  }
  return <LoadingState testID="wallet-loading" />;
}

const keyExtractor = (item: WalletCard) => item.id;

const renderItem = ({ item }: { item: WalletCard }) => <CardRow card={item} />;

function CardRow({ card }: { card: WalletCard }) {
  const scheme = useThemeName();
  const subtitle = card.pinned
    ? `Pinned · ${spaced(card.number, card.format as CardFormat)}`
    : spaced(card.number, card.format as CardFormat);
  return (
    <Pressable
      role="button"
      aria-label={card.name}
      testID={`wallet-card-${card.id}`}
      onPress={() => router.push({ pathname: '/wallet/card/[id]', params: { id: card.id } })}>
      <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: cardColor(card.color, scheme) }]} />
        <View style={styles.texts}>
          <ThemedText numberOfLines={1}>{card.name}</ThemedText>
          <ThemedText type="footnote" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  add: { alignItems: 'flex-start', paddingBottom: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
  },
  swatch: { width: Spacing.four, height: Spacing.four, borderRadius: Spacing.two },
  texts: { flex: 1 },
});
