import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

import { shareCsv } from '../../data/csv-file';
import { type Entry, useCategories, useEntries, useItems } from '../../data/queries';
import type { EntryKind } from '../../data/schema';
import { formatExact } from '../../domain/amount';
import { isIsoDate } from '../../domain/dates';
import { categoryLabel, inView } from '../../domain/owners';
import { emptyFilter, type Filter, filterEntries, isFiltering, toCsv } from '../../domain/search';
import { Chips, Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';
import { useMoneyView } from '../components/use-money-view';
import { ViewChips } from '../components/view-chips';

const kinds = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'payout', label: 'Payout' },
] as const;

/** Find entries of the open view by text, category, type or dates, and export them as CSV. */
export function MoneySearch() {
  const entries = useEntries();
  const items = useItems();
  const categories = useCategories();
  const scope = useMoneyView();
  return (
    <MoneyScreen id="money-search" title="Search">
      <Gate queries={[entries, items, categories, ...scope.queries]} id="money-search">
        <ViewChips view={scope.view} businesses={scope.live} onChange={scope.setView} />
        <SearchForm
          entries={(entries.data ?? []).filter((entry) => inView(entry, scope.view))}
          items={items.data ?? []}
          businesses={scope.businesses}
          categories={(categories.data ?? [])
            .filter((c) => scope.categorySpaces.includes(c.space))
            .map((c) => ({ id: c.id, label: categoryLabel(c, scope.view === 'all') }))}
        />
      </Gate>
    </MoneyScreen>
  );
}

function SearchForm({
  entries,
  items,
  categories,
  businesses,
}: {
  entries: Entry[];
  items: { entryId: string; name: string; amountMinor: number; categoryId: string }[];
  categories: { id: string; label: string }[];
  businesses: { id: string; name: string }[];
}) {
  const today = useToday();
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const names = new Map(categories.map((c) => [c.id, c.label]));
  const businessNames = new Map(businesses.map((b) => [b.id, b.name]));
  // Dates apply once they are complete valid dates, so a half-typed one never filters.
  const effective: Filter = {
    ...filter,
    from: isIsoDate(from) ? from : null,
    to: isIsoDate(to) ? to : null,
  };
  const found = filterEntries(entries, items, names, effective).sort((a, b) =>
    a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1,
  );

  const exportCsv = () => {
    setError(null);
    shareCsv(toCsv(found, items, names, businessNames), today).catch(() =>
      setError('Could not export the file.'),
    );
  };
  const reset = () => {
    setFilter(emptyFilter);
    setFrom('');
    setTo('');
  };

  return (
    <>
      <Group>
        <Field
          label="Search"
          value={filter.query}
          onChangeText={(query) => setFilter({ ...filter, query })}
          placeholder="Note, category or item"
          testID="money-search-query"
        />
      </Group>
      <Group title="Type">
        <Chips<EntryKind>
          options={kinds}
          value={filter.kind}
          onChange={(kind) => setFilter({ ...filter, kind: filter.kind === kind ? null : kind })}
          idPrefix="money-search-kind"
        />
      </Group>
      <Group title="Category">
        <Chips
          options={categories.map((c) => ({ value: c.id, label: c.label }))}
          value={filter.categoryId}
          onChange={(id) =>
            setFilter({ ...filter, categoryId: filter.categoryId === id ? null : id })
          }
          idPrefix="money-search-category"
        />
      </Group>
      <Group title="Dates">
        <Field
          label="From"
          value={from}
          onChangeText={setFrom}
          placeholder="From YYYY-MM-DD"
          autoCapitalize="none"
          maxLength={10}
          testID="money-search-from"
        />
        <Field
          label="To"
          value={to}
          onChangeText={setTo}
          placeholder="To YYYY-MM-DD"
          autoCapitalize="none"
          maxLength={10}
          testID="money-search-to"
        />
      </Group>
      <View style={styles.bar}>
        <ThemedText themeColor="textTertiary" testID="money-search-count">
          {`${found.length} ${found.length === 1 ? 'entry' : 'entries'}`}
        </ThemedText>
        {isFiltering(effective) || from || to ? (
          <Pressable
            role="button"
            aria-label="Clear filters"
            onPress={reset}
            testID="money-search-clear"
            style={styles.link}>
            <ThemedText themeColor="accent">Clear</ThemedText>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <ThemedText themeColor="danger" role="alert" testID="money-search-error">
          {error}
        </ThemedText>
      ) : null}
      <PrimaryButton
        label="Export CSV"
        onPress={exportCsv}
        disabled={found.length === 0}
        testID="money-search-export"
      />
      <Group>
        {found.length === 0 ? (
          <ThemedText themeColor="textTertiary" testID="money-search-empty">
            Nothing matches.
          </ThemedText>
        ) : (
          found.map((entry) => (
            <Pressable
              key={entry.id}
              role="button"
              aria-label={`${entry.date} ${entry.note || names.get(entry.categoryId ?? '') || entry.kind}`}
              onPress={() => router.push({ pathname: '/money/entry', params: { id: entry.id } })}
              testID={`money-search-result-${entry.id}`}
              style={styles.result}>
              <View style={styles.text}>
                <ThemedText>
                  {names.get(entry.categoryId ?? '') ??
                    (entry.kind === 'payout' ? 'Payout' : 'Split')}
                </ThemedText>
                <ThemedText
                  type="footnote"
                  themeColor="textTertiary">{`${entry.date}${entry.note ? ` · ${entry.note}` : ''}`}</ThemedText>
              </View>
              <ThemedText>{formatExact(entry.amountMinor, entry.currency)}</ThemedText>
            </Pressable>
          ))
        )}
      </Group>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { minHeight: 44, justifyContent: 'center' },
  result: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1 },
});
