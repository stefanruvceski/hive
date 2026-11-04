import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Fonts, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { rememberDeletedReceipt } from '../../data/deleted-receipt';
import {
  type Receipt,
  type ReceiptItem,
  useDeleteReceipt,
  useEditReceiptItem,
  useEditReceiptNote,
  useReceipt,
  useRetryReceipt,
  useSetReceiptOwner,
  useStarReceipt,
} from '../../data/receipt-queries';
import { number } from '../../domain/fiscal-parse';
import { isPib, toMinor } from '../../domain/receipt-events';
import { formatAmount, receiptDate, titleOf } from '../../domain/receipt-stats';
import { Chips, Field } from '../components/form';
import { TextButton } from '../components/text-button';
import { WalletScreen } from '../components/wallet-screen';

/** One receipt with all its items; the owner, item prices and quantities can be corrected. */
export function WalletReceiptScreen({ id }: { id: string }) {
  const { data, error, isError, refetch } = useReceipt(id);

  if (data) return <ReceiptView receipt={data} />;
  if (isError) {
    return (
      <ErrorState error={error} onRetry={() => void refetch()} testID="wallet-receipt-error" />
    );
  }
  if (data === null)
    return <EmptyState title="Receipt not found" testID="wallet-receipt-missing" />;
  return <LoadingState testID="wallet-receipt-loading" />;
}

type OwnerKind = 'personal' | 'company';
const ownerOptions = [
  { value: 'personal', label: 'Personal' },
  { value: 'company', label: 'Company' },
] as const;

function ReceiptView({ receipt }: { receipt: Receipt }) {
  const theme = useTheme();
  const star = useStarReceipt();
  const saveNote = useEditReceiptNote();
  const retry = useRetryReceipt();
  const remove = useDeleteReceipt();
  const [note, setNote] = useState(receipt.note);
  const [printed, setPrinted] = useState(false);

  const confirmDelete = () =>
    Alert.alert('Delete this receipt?', 'You can undo this right after.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(receipt.id, {
            onSuccess: (row) => {
              rememberDeletedReceipt(row);
              router.back();
            },
          }),
      },
    ]);

  const details: [string, string | null][] = [
    ['Date', receipt.time ? receipt.time.replace('T', ' ') : receiptDate(receipt)],
    ['Payment', receipt.payment],
    ['Company', receipt.company],
    ['Address', [receipt.address, receipt.city].filter(Boolean).join(', ') || null],
    ['PIB', receipt.tin],
    ['Invoice', receipt.invoiceNumber],
  ];

  return (
    <WalletScreen id="wallet-receipt" title={titleOf(receipt)}>
      {receipt.status === 'ok' && receipt.total !== null ? (
        <ThemedText type="title" testID="wallet-receipt-total">
          {formatAmount(receipt.total)} RSD
        </ThemedText>
      ) : (
        <View style={styles.block} testID="wallet-receipt-status">
          <ThemedText>{receipt.status === 'failed' ? 'Failed' : 'Pending'}</ThemedText>
          <ThemedText type="hint">
            {receipt.error ?? 'Waiting for the tax office. Pull down on the list to try again.'}
          </ThemedText>
          <PrimaryButton
            label="Try again"
            disabled={retry.isPending}
            onPress={() => retry.mutate(receipt.id)}
            testID="wallet-receipt-retry"
          />
        </View>
      )}
      {receipt.refund ? <ThemedText themeColor="danger">Refund</ThemedText> : null}
      {details.map(([label, value]) =>
        value ? (
          <View key={label} style={styles.detail}>
            <ThemedText type="footnote">{label}</ThemedText>
            <ThemedText style={styles.value}>{value}</ThemedText>
          </View>
        ) : null,
      )}
      {receipt.status === 'ok' ? <OwnerEditor receipt={receipt} /> : null}
      {receipt.items.length > 0 ? (
        <View style={styles.block}>
          <ThemedText type="listHeader" role="heading">
            Items
          </ThemedText>
          {receipt.items.map((item) => (
            <ItemRow key={item.id} receiptId={receipt.id} item={item} />
          ))}
        </View>
      ) : null}
      <Field
        label="Note"
        value={note}
        onChangeText={setNote}
        onEndEditing={() => saveNote.mutate({ id: receipt.id, note })}
        testID="wallet-receipt-note"
      />
      <View style={styles.actions}>
        <PrimaryButton
          label={receipt.starred ? 'Unstar' : 'Star'}
          onPress={() => star.mutate({ id: receipt.id, starred: !receipt.starred })}
          testID="wallet-receipt-star"
        />
        {receipt.journal ? (
          <PrimaryButton
            label={printed ? 'Hide printed' : 'See as printed'}
            onPress={() => setPrinted((on) => !on)}
            testID="wallet-receipt-printed-toggle"
          />
        ) : null}
        <PrimaryButton label="Delete" onPress={confirmDelete} testID="wallet-receipt-delete" />
      </View>
      {printed && receipt.journal ? (
        <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.printed}>
          <ThemedText type="code" style={{ color: theme.text }} testID="wallet-receipt-printed">
            {receipt.journal}
          </ThemedText>
        </GlassSurface>
      ) : null}
    </WalletScreen>
  );
}

/** Personal, or a company by its PIB. A choice made here survives reading the receipt again. */
function OwnerEditor({ receipt }: { receipt: Receipt }) {
  const setOwner = useSetReceiptOwner();
  const [kind, setKind] = useState<OwnerKind>(receipt.buyerTin ? 'company' : 'personal');
  const [pib, setPib] = useState(receipt.buyerTin ?? '');
  const valid = kind === 'personal' || isPib(pib);
  const changed = (kind === 'company' ? pib.trim() : null) !== receipt.buyerTin;
  return (
    <View style={styles.block}>
      <Chips
        label="Belongs to"
        options={ownerOptions}
        value={kind}
        onChange={setKind}
        testID="wallet-receipt-owner"
      />
      {kind === 'company' ? (
        <Field
          label="Company PIB"
          value={pib}
          onChangeText={setPib}
          keyboardType="number-pad"
          maxLength={9}
          testID="wallet-receipt-owner-pib"
        />
      ) : null}
      <PrimaryButton
        label="Save owner"
        disabled={!valid || !changed}
        onPress={() =>
          setOwner.mutate({ id: receipt.id, buyerTin: kind === 'company' ? pib.trim() : null })
        }
        testID="wallet-receipt-owner-save"
      />
    </View>
  );
}

const toText = (value: number) => String(value).replace('.', ',');

/** An item; tap Edit to correct a misread price or quantity. */
function ItemRow({ receiptId, item }: { receiptId: string; item: ReceiptItem }) {
  const theme = useTheme();
  const edit = useEditReceiptItem();
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(toText(item.quantity));
  const [price, setPrice] = useState(toText(item.unitPrice / 100));
  const q = number(quantity);
  const p = number(price);
  const valid = q !== null && p !== null;

  return (
    <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.item}>
      <View style={styles.itemHead}>
        <ThemedText style={styles.itemName}>{item.name}</ThemedText>
        <ThemedText testID={`wallet-receipt-item-total-${item.id}`}>
          {formatAmount(item.total)}
        </ThemedText>
      </View>
      <ThemedText type="footnote">
        {toText(item.quantity)}
        {item.unit ? ` ${item.unit}` : ''} × {formatAmount(item.unitPrice)}
        {item.vat ? ` · ${item.vat}` : ''}
      </ThemedText>
      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            aria-label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            selectionColor={theme.accent}
            style={[styles.editInput, { color: theme.text }]}
            testID={`wallet-receipt-item-qty-${item.id}`}
          />
          <TextInput
            aria-label="Unit price"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            selectionColor={theme.accent}
            style={[styles.editInput, { color: theme.text }]}
            testID={`wallet-receipt-item-price-${item.id}`}
          />
          <PrimaryButton
            label="Save"
            size="compact"
            disabled={!valid}
            onPress={() => {
              if (q === null || p === null) return;
              edit.mutate(
                { receiptId, itemId: item.id, quantity: q, unitPrice: toMinor(p) },
                { onSuccess: () => setEditing(false) },
              );
            }}
            testID={`wallet-receipt-item-save-${item.id}`}
          />
        </View>
      ) : (
        <TextButton
          label="Edit"
          onPress={() => setEditing(true)}
          testID={`wallet-receipt-item-edit-${item.id}`}
        />
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  block: { gap: Layout.labelGap },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  value: { flex: 1, textAlign: 'right' },
  itemName: { flex: 1 },
  actions: { gap: Spacing.two, alignItems: 'flex-start' },
  item: { padding: Spacing.three, gap: Spacing.one, alignItems: 'stretch' },
  itemHead: { flexDirection: 'row', gap: Spacing.three, justifyContent: 'space-between' },
  editRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  editInput: { flex: 1, minHeight: Layout.minTouch, fontSize: 17, fontFamily: Fonts.sans },
  printed: { padding: Spacing.three },
});
