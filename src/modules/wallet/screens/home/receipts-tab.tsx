import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import {
  type Receipt,
  useAddReceipt,
  useReceipts,
  useSyncReceipts,
} from '../../data/receipt-queries';
import {
  byMonth,
  formatAmount,
  receiptDate,
  searchReceipts,
  titleOf,
} from '../../domain/receipt-stats';
import { CardScanner } from '../components/card-scanner';

type Row = { kind: 'month'; month: string } | { kind: 'receipt'; receipt: Receipt };

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const monthLabel = (month: string) =>
  `${monthNames[Number(month.slice(5, 7)) - 1] ?? month} ${month.slice(0, 4)}`;

function rowsOf(receipts: readonly Receipt[]): Row[] {
  return byMonth(receipts).flatMap(({ month, receipts: inMonth }) => [
    { kind: 'month' as const, month },
    ...inMonth.map((receipt) => ({ kind: 'receipt' as const, receipt })),
  ]);
}

/** The Receipts tab: scan or paste a fiscal receipt link, search, star and open receipts. */
export function ReceiptsTab() {
  const theme = useTheme();
  const { data, error, isError, refetch } = useReceipts();
  const { refresh, isRefreshing } = useSyncReceipts();
  const add = useAddReceipt();
  const [scanning, setScanning] = useState(false);
  const [link, setLink] = useState('');
  const [query, setQuery] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addText = (text: string) => {
    setMessage(null);
    add.mutate(text, {
      onSuccess: ({ duplicate }) => {
        setLink('');
        if (duplicate) setMessage('This receipt is already saved.');
      },
      onError: (e) => setMessage(e.message),
    });
  };

  const header = (
    <View style={styles.header}>
      {scanning ? (
        <CardScanner
          barcodeTypes={['qr']}
          onScanned={(text) => {
            setScanning(false);
            addText(text);
          }}
          onClose={() => setScanning(false)}
        />
      ) : (
        <PrimaryButton
          label="Scan receipt"
          onPress={() => setScanning(true)}
          testID="wallet-receipt-scan"
        />
      )}
      <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.field}>
        <TextInput
          aria-label="Receipt link"
          placeholder="Or paste the receipt link"
          placeholderTextColor={theme.textQuaternary}
          selectionColor={theme.accent}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
          testID="wallet-receipt-link"
          style={[styles.input, { color: theme.text }]}
        />
      </GlassSurface>
      <PrimaryButton
        label="Add link"
        disabled={link.trim() === '' || add.isPending}
        onPress={() => addText(link)}
        testID="wallet-receipt-add-link"
      />
      {message ? (
        <ThemedText role="alert" themeColor="danger" testID="wallet-receipt-message">
          {message}
        </ThemedText>
      ) : null}
      <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.field}>
        <TextInput
          aria-label="Search receipts"
          placeholder="Search shop, item or note"
          placeholderTextColor={theme.textQuaternary}
          selectionColor={theme.accent}
          value={query}
          onChangeText={setQuery}
          testID="wallet-receipt-search"
          style={[styles.input, { color: theme.text }]}
        />
      </GlassSurface>
      <Pressable
        role="switch"
        aria-checked={starredOnly}
        aria-label="Starred only"
        onPress={() => setStarredOnly((on) => !on)}
        hitSlop={8}
        style={styles.toggle}
        testID="wallet-receipt-starred-filter">
        <ThemedText themeColor={starredOnly ? 'accentText' : 'textTertiary'}>
          {starredOnly ? '★ Starred only' : '☆ Starred only'}
        </ThemedText>
      </Pressable>
    </View>
  );

  if (data) {
    const shown = searchReceipts(starredOnly ? data.filter((r) => r.starred) : data, query);
    if (data.length === 0 && !scanning) {
      return (
        <EmptyState
          title="No receipts yet"
          description="Scan the QR code on a Serbian fiscal receipt and keep it with all its items."
          action={header}
          testID="wallet-receipts-empty"
        />
      );
    }
    return (
      <FlatList
        data={rowsOf(shown)}
        keyExtractor={keyOf}
        renderItem={({ item }) =>
          item.kind === 'month' ? (
            <ThemedText type="listHeader" role="heading" style={styles.month}>
              {monthLabel(item.month)}
            </ThemedText>
          ) : (
            <ReceiptRow receipt={item.receipt} />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <ThemedText type="hint" testID="wallet-receipts-none">
            No receipts match.
          </ThemedText>
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        testID="wallet-receipts-list"
      />
    );
  }
  if (isError) {
    return (
      <ErrorState error={error} onRetry={() => void refetch()} testID="wallet-receipts-error" />
    );
  }
  return <LoadingState testID="wallet-receipts-loading" />;
}

const keyOf = (row: Row) => (row.kind === 'month' ? `m-${row.month}` : row.receipt.id);

const statusText = { pending: 'Pending', failed: 'Failed', ok: '' } as const;

function ReceiptRow({ receipt }: { receipt: Receipt }) {
  const status = statusText[receipt.status];
  const subtitle = [receiptDate(receipt), status].filter(Boolean).join(' · ');
  return (
    <Pressable
      role="button"
      aria-label={titleOf(receipt)}
      testID={`wallet-receipt-${receipt.id}`}
      onPress={() => router.push({ pathname: '/wallet/receipt/[id]', params: { id: receipt.id } })}>
      <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.row}>
        <View style={styles.texts}>
          <ThemedText numberOfLines={1}>
            {receipt.starred ? '★ ' : ''}
            {titleOf(receipt)}
          </ThemedText>
          <ThemedText type="footnote" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
        {receipt.status === 'ok' && receipt.total !== null ? (
          <ThemedText testID={`wallet-receipt-total-${receipt.id}`}>
            {formatAmount(receipt.total)}
          </ThemedText>
        ) : null}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: { gap: Spacing.two, alignItems: 'stretch', paddingBottom: Spacing.two },
  field: { paddingHorizontal: Layout.listRow.paddingHorizontal },
  input: { minHeight: Layout.listRow.minHeight, fontSize: 17 },
  toggle: { minHeight: Layout.minTouch, justifyContent: 'center' },
  month: { paddingTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
  },
  texts: { flex: 1 },
});
