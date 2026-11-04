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

import { useShopGroups } from '../../data/price-queries';
import {
  type Receipt,
  useAddReceipt,
  useReceipts,
  useSyncReceipts,
} from '../../data/receipt-queries';
import type { AliasGroup } from '../../domain/aliases';
import { byMonth, formatAmount, receiptDate, searchReceipts } from '../../domain/receipt-stats';
import { shopOf } from '../../domain/shop-brands';
import { CardScanner } from '../components/card-scanner';
import { TextButton } from '../components/text-button';
import { rowLines, useStackedRow } from '../components/use-stacked-row';

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

type TabProps = {
  /** The camera is open (the scan button is in the screen header). */
  scanning?: boolean;
  onScanningChange?: (scanning: boolean) => void;
  /** Only the receipts of the company with this shop PIB. */
  pib?: string;
  onClearPib?: () => void;
};

/** The Receipts tab: search, add a link, open receipts; the scan button is in the header. */
export function ReceiptsTab({ scanning = false, onScanningChange, pib, onClearPib }: TabProps) {
  const theme = useTheme();
  const { data, error, isError, refetch } = useReceipts();
  const groups = useShopGroups().data ?? [];
  const { refresh, isRefreshing } = useSyncReceipts();
  const add = useAddReceipt();
  const [query, setQuery] = useState('');
  const [link, setLink] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const addText = (text: string) => {
    setMessage(null);
    add.mutate(text, {
      onSuccess: ({ duplicate }) => {
        if (duplicate) setMessage('This receipt is already saved.');
        else setLink('');
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
            onScanningChange?.(false);
            addText(text);
          }}
          onClose={() => onScanningChange?.(false)}
        />
      ) : null}
      {message ? (
        <ThemedText role="alert" themeColor="danger" testID="wallet-receipt-message">
          {message}
        </ThemedText>
      ) : null}
      {pib ? (
        <Pressable
          role="button"
          aria-label="Show all companies"
          onPress={onClearPib}
          style={styles.toggle}
          testID="wallet-receipts-company-filter">
          <ThemedText themeColor="accentText">{`Only ${pib} · Show all`}</ThemedText>
        </Pressable>
      ) : null}
      <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.field}>
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
      <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.field}>
        <TextInput
          aria-label="Receipt link"
          placeholder="Paste a receipt link"
          placeholderTextColor={theme.textQuaternary}
          selectionColor={theme.accent}
          autoCapitalize="none"
          autoCorrect={false}
          value={link}
          onChangeText={setLink}
          testID="wallet-receipt-link"
          style={[styles.input, { color: theme.text }]}
        />
      </GlassSurface>
      <PrimaryButton
        label="Add link"
        disabled={link.trim().length === 0 || add.isPending}
        onPress={() => addText(link)}
        testID="wallet-receipt-link-add"
      />
      <TextButton
        label="Prices by shop"
        onPress={() => router.push('/wallet/prices')}
        testID="wallet-open-prices"
      />
    </View>
  );

  if (data) {
    const ofCompany = pib ? data.filter((r) => r.tin?.trim() === pib) : data;
    const shown = searchReceipts(ofCompany, query, groups);
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
            <ReceiptRow receipt={item.receipt} groups={groups} />
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

function ReceiptRow({ receipt, groups }: { receipt: Receipt; groups: readonly AliasGroup[] }) {
  const name = shopOf(receipt, groups)[1];
  const stacked = useStackedRow();
  const lines = rowLines(stacked);
  const status = statusText[receipt.status];
  const subtitle = [receiptDate(receipt), status].filter(Boolean).join(' · ');
  return (
    <Pressable
      role="button"
      aria-label={name}
      testID={`wallet-receipt-${receipt.id}`}
      onPress={() => router.push({ pathname: '/wallet/receipt/[id]', params: { id: receipt.id } })}>
      <GlassSurface
        kind="glass"
        radius={Layout.radius.row}
        style={[styles.row, stacked && styles.stacked]}>
        <View style={stacked ? undefined : styles.texts}>
          <ThemedText numberOfLines={lines}>{name}</ThemedText>
          <ThemedText type="footnote" numberOfLines={lines}>
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
  stacked: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: Spacing.two },
  texts: { flex: 1 },
});
