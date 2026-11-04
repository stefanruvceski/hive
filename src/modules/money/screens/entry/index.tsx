import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

import {
  type Category,
  type Entry,
  type Item,
  useCategories,
  useDeleteEntry,
  useEntries,
  useItems,
  useRates,
  useSaveEntry,
} from '../../data/queries';
import { useNbsRate } from '../../data/rate-queries';
import type { EntryKind } from '../../data/schema';
import {
  baseCurrency,
  currencies,
  formatMinor,
  minorToText,
  parseAmount,
  parseRate,
  toRsdMinor,
} from '../../domain/amount';
import { addDays, isIsoDate } from '../../domain/dates';
import { checkItems } from '../../domain/items';
import { type Business, ownerForView, ownerOf, spaceOfOwner } from '../../domain/owners';
import { pickRate } from '../../domain/rates';
import { DateField } from '../components/date-field';
import { Chips, Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';
import { useMoneyView } from '../components/use-money-view';

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'payout', label: 'Payout' },
] as const;

type ItemRow = { key: number; name: string; amount: string; categoryId: string };

/** Add or edit an entry. With an `id` it edits that entry; without one it adds to the open space. */
export function MoneyEntry({ id }: { id?: string }) {
  const entries = useEntries();
  const items = useItems();
  const categories = useCategories();
  const rates = useRates();
  const scope = useMoneyView();
  const queries = [entries, items, categories, rates, ...scope.queries];
  const entry = id ? entries.data?.find((row) => row.id === id) : undefined;

  const title = id ? 'Edit entry' : 'New entry';

  if (queries.some((query) => query.data === undefined) || (id && !entry)) {
    return (
      <MoneyScreen id="money-entry" title={title}>
        <Gate queries={queries} id="money-entry">
          <ThemedText testID="money-entry-missing">This entry no longer exists.</ThemedText>
        </Gate>
      </MoneyScreen>
    );
  }
  return (
    <EntryForm
      title={title}
      entry={entry}
      entryItems={items.data?.filter((item) => item.entryId === id) ?? []}
      categories={categories.data ?? []}
      rates={rates.data ?? []}
      businesses={scope.businesses}
      startOwner={entry ? ownerOf(entry) : ownerForView(scope.view)}
    />
  );
}

type FormProps = {
  title: string;
  entry: Entry | undefined;
  entryItems: Item[];
  categories: Category[];
  rates: { currency: string; date: string; rate: number; source: 'nbs' | 'manual' }[];
  businesses: Business[];
  /** `private` or a business id. */
  startOwner: string;
};

// The form owns its fields from the first render, so it mounts only once the data is in.
function EntryForm({
  title,
  entry,
  entryItems,
  categories,
  rates,
  businesses,
  startOwner,
}: FormProps) {
  const today = useToday();
  const save = useSaveEntry();
  const remove = useDeleteEntry();
  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? 'expense');
  const [amount, setAmount] = useState(entry ? minorToText(entry.amountMinor) : '');
  const [currency, setCurrency] = useState(entry?.currency ?? baseCurrency);
  // null = follow the suggested rate for the currency and date.
  const [rateText, setRateText] = useState<string | null>(
    entry && entry.currency !== baseCurrency ? String(entry.rate) : null,
  );
  const [date, setDate] = useState(entry?.date ?? today);
  const [note, setNote] = useState(entry?.note ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(entry?.categoryId ?? null);
  const [rows, setRows] = useState<ItemRow[]>(() =>
    entryItems.map((item, index) => ({
      key: index,
      name: item.name,
      amount: minorToText(item.amountMinor),
      categoryId: item.categoryId,
    })),
  );
  const [nextKey, setNextKey] = useState(entryItems.length);
  const [error, setError] = useState<string | null>(null);
  // Who the entry belongs to, and for a payout the business it comes from.
  const live = businesses.filter((b) => !b.archivedAt || b.id === entry?.businessId);
  const [owner, setOwner] = useState(startOwner);
  const [from, setFrom] = useState<string | null>(
    entry?.businessId ?? (startOwner === 'private' ? (live[0]?.id ?? null) : startOwner),
  );
  const space = spaceOfOwner(owner);

  const choices = categories.filter(
    (category) =>
      category.space === space &&
      category.kind === (kind === 'income' ? 'income' : 'expense') &&
      !category.archivedAt,
  );
  const options = choices.map((category) => ({
    value: category.id,
    label: `${category.emoji} ${category.name}`,
  }));
  const chosenCategory = choices.some((c) => c.id === categoryId) ? categoryId : null;

  const foreign = currency !== baseCurrency;
  const nbs = useNbsRate(foreign && isIsoDate(date) ? currency : null, date, today);
  // The bank's rate for that day, else the latest one already known.
  const suggestion = nbs.data ?? pickRate(rates, currency, date)?.rate ?? null;
  const shownRate = rateText ?? (suggestion === null ? '' : String(suggestion));
  const minor = parseAmount(amount);
  const rate = foreign ? parseRate(shownRate) : 1;
  const rsd = minor !== null && rate !== null ? toRsdMinor(minor, rate) : null;
  const isPayout = kind === 'payout';

  const submit = () => {
    if (minor === null) return setError('Enter an amount greater than zero.');
    if (rate === null) return setError('Enter the exchange rate for this currency.');
    if (!isIsoDate(date)) return setError('Enter the date as YYYY-MM-DD.');
    if (isPayout && !from) return setError('Add a business first (Money › Businesses).');
    const draftItems = rows.map((row) => ({
      name: row.name.trim(),
      amountMinor: parseAmount(row.amount) ?? 0,
      categoryId: row.categoryId,
    }));
    if (!isPayout && draftItems.length > 0) {
      const check = checkItems(minor, draftItems);
      if (!check.ok) {
        return setError(
          check.reason === 'mismatch'
            ? `Items differ from the total by ${formatMinor(Math.abs(check.diff), currency)}.`
            : 'Every item needs a name and an amount.',
        );
      }
    } else if (!isPayout && !chosenCategory) {
      return setError('Choose a category.');
    }
    setError(null);
    save.mutate(
      {
        id: entry?.id,
        space: isPayout ? 'business' : space,
        businessId: isPayout ? from : owner === 'private' ? null : owner,
        kind,
        amountMinor: minor,
        currency,
        rate,
        date,
        note,
        categoryId: isPayout ? null : chosenCategory,
        items: isPayout ? [] : draftItems,
      },
      { onSuccess: () => router.back(), onError: () => setError('Could not save. Try again.') },
    );
  };

  const confirmDelete = () => {
    if (!entry) return;
    Alert.alert('Delete this entry?', 'It is removed from your totals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(entry.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  const addRow = () => {
    setRows([...rows, { key: nextKey, name: '', amount: '', categoryId: choices[0]?.id ?? '' }]);
    setNextKey(nextKey + 1);
  };
  const patchRow = (key: number, patch: Partial<ItemRow>) =>
    setRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <MoneyScreen
      id="money-entry"
      title={title}
      trailing={
        <PrimaryButton
          label="Save"
          size="compact"
          onPress={submit}
          disabled={save.isPending}
          testID="money-entry-save"
        />
      }>
      <SegmentedControl
        options={kindOptions}
        value={kind}
        onChange={setKind}
        label="Entry type"
        testID="money-entry-kind"
      />
      {isPayout ? (
        <ThemedText type="footnote" themeColor="textTertiary" testID="money-entry-payout-hint">
          Moves money from a business to Private. It counts once on each side and is never income.
        </ThemedText>
      ) : null}
      {live.length > 0 && !isPayout ? (
        <Group title="Owner">
          <Chips
            options={[
              { value: 'private', label: 'Private' },
              ...live.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={owner}
            onChange={setOwner}
            idPrefix="money-entry-owner"
          />
        </Group>
      ) : null}
      {isPayout ? (
        <Group title="From business">
          {live.length === 0 ? (
            <ThemedText themeColor="textTertiary" testID="money-entry-no-business">
              Add a business first (Money › Businesses).
            </ThemedText>
          ) : (
            <Chips
              options={live.map((b) => ({ value: b.id, label: b.name }))}
              value={from}
              onChange={setFrom}
              idPrefix="money-entry-from"
            />
          )}
        </Group>
      ) : null}
      <Group title="Amount">
        <Field
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          testID="money-entry-amount"
        />
        <Chips
          options={currencies.map((code) => ({ value: code, label: code }))}
          value={currency}
          onChange={setCurrency}
          idPrefix="money-entry-currency"
        />
        {foreign ? (
          <>
            {suggestion === null ? (
              <Field
                label={`Rate, RSD per ${currency}`}
                value={shownRate}
                onChangeText={setRateText}
                placeholder={`RSD per 1 ${currency}`}
                keyboardType="decimal-pad"
                testID="money-entry-rate"
              />
            ) : null}
            <ThemedText type="footnote" themeColor="textTertiary" testID="money-entry-rsd">
              {rsd !== null
                ? `= ${formatMinor(rsd)} at ${shownRate}${rateText === null && nbs.data ? ' (NBS middle rate)' : ''}`
                : nbs.isFetching
                  ? 'Getting the NBS rate…'
                  : 'Could not get the NBS rate. Enter one.'}
            </ThemedText>
          </>
        ) : null}
      </Group>
      <Group title="Date">
        <DateField label="Date" value={date} onChange={setDate} testID="money-entry-date" />
        <Chips
          options={[
            { value: 'today', label: 'Today' },
            { value: 'yesterday', label: 'Yesterday' },
          ]}
          value={date === today ? 'today' : date === addDays(today, -1) ? 'yesterday' : null}
          onChange={(value) => setDate(value === 'today' ? today : addDays(today, -1))}
          idPrefix="money-entry-day"
        />
      </Group>
      {isPayout ? null : (
        <Group title={rows.length > 0 ? 'Category (set per item)' : 'Category'}>
          {rows.length === 0 ? (
            <Chips
              options={options}
              value={chosenCategory}
              onChange={setCategoryId}
              idPrefix="money-entry-category"
            />
          ) : (
            <ThemedText type="footnote" themeColor="textTertiary">
              Each item has its own category.
            </ThemedText>
          )}
        </Group>
      )}
      {isPayout ? null : (
        <Group title="Items (optional)">
          {rows.map((row, index) => (
            <View key={row.key} style={styles.item} testID={`money-entry-item-${index}`}>
              <Field
                label={`Item ${index + 1} name`}
                value={row.name}
                onChangeText={(name) => patchRow(row.key, { name })}
                placeholder="Name"
                testID={`money-entry-item-name-${index}`}
              />
              <Field
                label={`Item ${index + 1} amount`}
                value={row.amount}
                onChangeText={(value) => patchRow(row.key, { amount: value })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                testID={`money-entry-item-amount-${index}`}
              />
              <Chips
                options={options}
                value={row.categoryId}
                onChange={(value) => patchRow(row.key, { categoryId: value })}
                idPrefix={`money-entry-item-category-${index}`}
              />
              <Pressable
                role="button"
                aria-label={`Remove item ${index + 1}`}
                onPress={() => setRows(rows.filter((r) => r.key !== row.key))}
                testID={`money-entry-item-remove-${index}`}
                style={styles.remove}>
                <ThemedText themeColor="danger">Remove</ThemedText>
              </Pressable>
            </View>
          ))}
          <Pressable
            role="button"
            aria-label="Add item"
            onPress={addRow}
            testID="money-entry-item-add"
            style={styles.remove}>
            <ThemedText themeColor="accent">Add item</ThemedText>
          </Pressable>
        </Group>
      )}
      <Group title="Note">
        <Field
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Optional"
          testID="money-entry-note"
        />
      </Group>
      {error ? (
        <ThemedText themeColor="danger" role="alert" testID="money-entry-error">
          {error}
        </ThemedText>
      ) : null}
      {entry ? (
        <Pressable
          role="button"
          aria-label="Delete entry"
          onPress={confirmDelete}
          testID="money-entry-delete"
          style={styles.remove}>
          <ThemedText themeColor="danger">Delete entry</ThemedText>
        </Pressable>
      ) : null}
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({
  item: { gap: Spacing.one, paddingVertical: Spacing.two },
  remove: { minHeight: 44, justifyContent: 'center' },
});
