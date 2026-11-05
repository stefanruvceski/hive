import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SaveButton } from '@/components/ui/save-button';
import { SwipeRow } from '@/components/ui/swipe-row';
import { Fonts, Layout, Spacing } from '@/constants/theme';
import { businessByPib, useBusinesses } from '@/hooks/use-businesses';
import { useTheme } from '@/hooks/use-theme';
import type { SwipeSide } from '@/utils/swipe';

import { rememberDeletedReceipt } from '../../data/deleted-receipt';
import { useShopGroups } from '../../data/price-queries';
import {
  type Receipt,
  type ReceiptItem,
  useDeleteReceipt,
  useDeleteReceiptItem,
  useEditReceiptItem,
  useEditReceiptNote,
  useReceipt,
  useRetryReceipt,
  useSetReceiptOwner,
} from '../../data/receipt-queries';
import { cleanItemName, number, unitLabel } from '../../domain/fiscal-parse';
import { isPib, toMinor } from '../../domain/receipt-events';
import { formatAmount, receiptDate } from '../../domain/receipt-stats';
import { shopOf } from '../../domain/shop-brands';
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

function ReceiptView({ receipt }: { receipt: Receipt }) {
  const theme = useTheme();
  const groups = useShopGroups().data ?? [];
  const saveNote = useEditReceiptNote();
  const retry = useRetryReceipt();
  const remove = useDeleteReceipt();
  const owner = useOwnerEditor(receipt);
  const [note, setNote] = useState(receipt.note);
  const [printed, setPrinted] = useState(false);
  const [openItem, setOpenItem] = useState<{ id: string; side: SwipeSide } | null>(null);
  const company = shopOf(receipt, groups)[1];
  const shopPib = receipt.tin?.trim() || null;

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

  // Kept and stored, but only shown under "see as printed".
  const printedDetails: [string, string | null][] = [
    ['Shop PIB', shopPib],
    ['Company', receipt.company],
    ['Address', [receipt.address, receipt.city].filter(Boolean).join(', ') || null],
    ['Invoice', receipt.invoiceNumber],
    ['Payment', receipt.payment],
  ];

  return (
    <WalletScreen
      id="wallet-receipt"
      title={company}
      trailing={
        <>
          {receipt.status === 'ok' && owner.canSave ? (
            <SaveButton onPress={owner.save} testID="wallet-receipt-owner-save" />
          ) : null}
          {receipt.journal ? (
            <GlassButton
              icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
              label={printed ? 'Hide printed' : 'See as printed'}
              onPress={() => setPrinted((on) => !on)}
              testID="wallet-receipt-printed-toggle"
            />
          ) : null}
          <GlassButton
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            label="Delete"
            onPress={confirmDelete}
            testID="wallet-receipt-delete"
          />
        </>
      }>
      {receipt.status === 'ok' ? <OwnerEditor editor={owner} /> : null}
      <View style={styles.dateRow}>
        <ThemedText type="footnote" testID="wallet-receipt-date">
          {receipt.time ? receipt.time.replace('T', ' ').slice(0, 16) : receiptDate(receipt)}
        </ThemedText>
        {shopPib ? (
          <TextButton
            label={`All receipts of ${company}`}
            onPress={() =>
              router.push({ pathname: '/wallet', params: { tab: 'receipts', pib: shopPib } })
            }
            testID="wallet-receipt-company"
          />
        ) : null}
      </View>
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
      {receipt.items.length > 0 ? (
        <View style={styles.block}>
          <ThemedText type="listHeader" role="heading">
            Items
          </ThemedText>
          {receipt.items.map((item) => (
            <ItemRow
              key={item.id}
              receiptId={receipt.id}
              item={item}
              open={openItem?.id === item.id ? openItem.side : null}
              onOpenChange={(side) => setOpenItem(side ? { id: item.id, side } : null)}
            />
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
      {printed && receipt.journal ? (
        <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.printed}>
          {printedDetails.map(([label, value]) =>
            value ? (
              <View key={label} style={styles.detail}>
                <ThemedText type="footnote">{label}</ThemedText>
                <ThemedText style={styles.value}>{value}</ThemedText>
              </View>
            ) : null,
          )}
          <ThemedText type="code" style={{ color: theme.text }} testID="wallet-receipt-printed">
            {receipt.journal}
          </ThemedText>
        </GlassSurface>
      ) : null}
    </WalletScreen>
  );
}

const PERSONAL = 'personal';
const OTHER = 'other';
const pibValue = (pib: string) => `pib:${pib}`;

/**
 * Whose receipt it is: Personal, a business Money and Wallet both know, or a new PIB as the
 * fallback. The chosen pill is the current owner; the header's check appears only when there is a
 * change to save.
 */
function useOwnerEditor(receipt: Receipt) {
  const setOwner = useSetReceiptOwner();
  const businesses = useBusinesses().data ?? [];
  const live = businesses.filter((b) => !b.archivedAt || b.pib === receipt.buyerTin);
  const current = businessByPib(businesses, receipt.buyerTin);
  const [choice, setChoice] = useState(() =>
    receipt.buyerTin === null ? PERSONAL : current ? pibValue(current.pib) : OTHER,
  );
  const [pib, setPib] = useState(current ? '' : (receipt.buyerTin ?? ''));

  const options = [
    { value: PERSONAL, label: 'Personal' },
    ...live.map((b) => ({ value: pibValue(b.pib), label: b.name })),
    { value: OTHER, label: 'Another PIB' },
  ];
  const typed = pib.trim();
  const target =
    choice === PERSONAL ? null : choice === OTHER ? typed : choice.slice('pib:'.length);
  const problem =
    choice === OTHER && typed.length > 0 && !isPib(typed)
      ? `A PIB has 9 digits (${typed.length} typed).`
      : null;
  const valid = choice === PERSONAL || (target !== null && isPib(target));
  const changed = target !== receipt.buyerTin;
  return {
    options,
    choice,
    setChoice,
    pib,
    setPib,
    problem,
    canSave: changed && valid,
    save: () => setOwner.mutate({ id: receipt.id, buyerTin: target }),
  };
}

function OwnerEditor({ editor }: { editor: ReturnType<typeof useOwnerEditor> }) {
  return (
    <View style={styles.block}>
      <Chips
        label="Belongs to"
        options={editor.options}
        value={editor.choice}
        onChange={editor.setChoice}
        testID="wallet-receipt-owner"
      />
      {editor.choice === OTHER ? (
        <Field
          label="Company PIB"
          value={editor.pib}
          onChangeText={editor.setPib}
          keyboardType="number-pad"
          maxLength={9}
          testID="wallet-receipt-owner-pib"
        />
      ) : null}
      {editor.problem ? (
        <ThemedText role="alert" themeColor="danger" testID="wallet-receipt-owner-problem">
          {editor.problem}
        </ThemedText>
      ) : null}
    </View>
  );
}

const toText = (value: number) => String(value).replace('.', ',');

/** An item: swipe towards the end to correct a misread price or quantity, towards the start to delete it. */
function ItemRow({
  receiptId,
  item,
  open,
  onOpenChange,
}: {
  receiptId: string;
  item: ReceiptItem;
  open: SwipeSide | null;
  onOpenChange: (side: SwipeSide | null) => void;
}) {
  const theme = useTheme();
  const edit = useEditReceiptItem();
  const remove = useDeleteReceiptItem();
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(toText(item.quantity));
  const [price, setPrice] = useState(toText(item.unitPrice / 100));
  const q = number(quantity);
  const p = number(price);
  const valid = q !== null && p !== null;
  const name = cleanItemName(item.name);

  const confirmDelete = () =>
    Alert.alert('Delete this item?', `${name} is taken off this receipt.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate({ receiptId, itemId: item.id }),
      },
    ]);

  return (
    <View style={styles.swipe}>
      <SwipeRow
        open={open}
        onOpenChange={onOpenChange}
        onEdit={() => setEditing(true)}
        onArchive={confirmDelete}
        archiveLabel="Delete"
        enabled={!editing}
        name={name}
        testID={`wallet-receipt-item-${item.id}`}>
        <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.item}>
          <View style={styles.itemHead}>
            <ThemedText style={styles.itemName}>{name}</ThemedText>
            <ThemedText testID={`wallet-receipt-item-total-${item.id}`}>
              {formatAmount(item.total)}
            </ThemedText>
          </View>
          <ThemedText type="footnote">
            {toText(item.quantity)}
            {item.unit ? ` ${unitLabel(item.unit)}` : ''} × {formatAmount(item.unitPrice)}
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
          ) : null}
        </GlassSurface>
      </SwipeRow>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Layout.labelGap },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  value: { flex: 1, textAlign: 'right' },
  itemName: { flex: 1 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  swipe: { borderRadius: Layout.radius.row, overflow: 'hidden' },
  item: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, alignItems: 'stretch' },
  itemHead: { flexDirection: 'row', gap: Spacing.three, justifyContent: 'space-between' },
  editRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  editInput: { flex: 1, minHeight: Layout.minTouch, fontSize: 17, fontFamily: Fonts.sans },
  printed: { padding: Spacing.three, gap: Spacing.two },
});
