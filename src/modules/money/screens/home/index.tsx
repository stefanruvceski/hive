import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

import { type Category, type Entry, useCategories, useEntries } from '../../data/queries';
import { useGenerateRecurring } from '../../data/recurring-queries';
import { formatMinor, formatWhole } from '../../domain/amount';
import { monthLabel, monthOf, shiftMonth } from '../../domain/dates';
import { groupByDay, totalsOf } from '../../domain/entries';
import { categoryLabel, inView, type Business } from '../../domain/owners';
import { Group, LinkRow } from '../components/fields';
import { Gate } from '../components/gate';
import { useMoneyView } from '../components/use-money-view';
import { ViewChips } from '../components/view-chips';

const openEntry = (id?: string) =>
  router.push(id ? { pathname: '/money/entry', params: { id } } : '/money/entry');

/** Money's entry screen: the open space, one month at a time, newest day first. */
export function MoneyHome() {
  const today = useToday();
  const generate = useGenerateRecurring();
  const { mutate } = generate;

  // Entries owed by recurring rules appear when the module opens and when the day changes.
  useEffect(() => {
    mutate(today);
  }, [mutate, today]);

  return (
    <Wallpaper style={styles.container} testID="money-screen">
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={[styles.header, styles.width]}>
          <GlassButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            label="Back"
            onPress={() => router.back()}
            testID="money-back"
          />
          <View style={styles.actions}>
            <GlassButton
              icon={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              label="Search"
              onPress={() => router.push('/money/search')}
              testID="money-search-open"
            />
            <GlassButton
              icon={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }}
              label="Overview"
              onPress={() => router.push('/money/overview')}
              testID="money-overview-open"
            />
            <GlassButton
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              label="Add entry"
              onPress={() => openEntry()}
              testID="money-add"
            />
          </View>
        </View>
        <MoneyContent today={today} />
      </SafeAreaView>
    </Wallpaper>
  );
}

// Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3).
function MoneyContent({ today }: { today: string }) {
  const insets = useSafeAreaInsets();
  const entries = useEntries();
  const categories = useCategories();
  const scope = useMoneyView();
  const [month, setMonth] = useState(monthOf(today));

  return (
    <ScrollView
      contentContainerStyle={[
        styles.width,
        styles.content,
        { paddingBottom: insets.bottom + Spacing.five },
      ]}
      testID="money-content">
      <ThemedText type="title" role="heading" testID="money-title">
        Money
      </ThemedText>
      <ViewChips view={scope.view} businesses={scope.live} onChange={scope.setView} />
      <MonthSwitcher
        month={month}
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={month < monthOf(today) ? () => setMonth(shiftMonth(month, 1)) : undefined}
      />
      <Gate queries={[entries, categories, ...scope.queries]} id="money">
        <Month
          entries={(entries.data ?? []).filter(
            (entry) => inView(entry, scope.view) && monthOf(entry.date) === month,
          )}
          categories={categories.data ?? []}
          businesses={scope.businesses}
          showOwner={scope.view === 'all' && scope.live.length > 0}
        />
      </Gate>
      <Group title="Manage">
        <LinkRow
          title="Budgets"
          onPress={() => router.push('/money/budgets')}
          testID="money-budgets-open"
        />
        <LinkRow
          title="Recurring"
          onPress={() => router.push('/money/recurring')}
          testID="money-recurring-open"
        />
        <LinkRow
          title="Businesses"
          onPress={() => router.push('/money/businesses')}
          testID="money-businesses-open"
        />
        <LinkRow
          title="Categories"
          onPress={() => router.push('/money/categories')}
          testID="money-categories-open"
        />
        <LinkRow
          title="Exchange rates"
          onPress={() => router.push('/money/rates')}
          testID="money-rates-open"
        />
      </Group>
    </ScrollView>
  );
}

function MonthSwitcher({
  month,
  onPrevious,
  onNext,
}: {
  month: string;
  onPrevious: () => void;
  onNext?: () => void;
}) {
  return (
    <View style={styles.switcher}>
      <Arrow label="Previous month" glyph="‹" onPress={onPrevious} testID="money-month-prev" />
      <ThemedText type="headline" role="heading" testID="money-month-label">
        {monthLabel(month)}
      </ThemedText>
      <Arrow label="Next month" glyph="›" onPress={onNext} testID="money-month-next" />
    </View>
  );
}

function Arrow({
  label,
  glyph,
  onPress,
  testID,
}: {
  label: string;
  glyph: string;
  onPress?: () => void;
  testID: string;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={!onPress}
      disabled={!onPress}
      onPress={onPress}
      testID={testID}
      style={[styles.arrow, !onPress && styles.disabled]}>
      <ThemedText type="headline" themeColor="accentText" aria-hidden>
        {glyph}
      </ThemedText>
    </Pressable>
  );
}

function Month({
  entries,
  categories,
  businesses,
  showOwner,
}: {
  entries: Entry[];
  categories: Category[];
  businesses: Business[];
  showOwner: boolean;
}) {
  const names = new Map(categories.map((c) => [c.id, categoryLabel(c, showOwner)]));
  const owners = new Map(businesses.map((b) => [b.id, b.name]));
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nothing this month"
        description="Add what you earn and spend, and it adds up here."
        action={
          <PrimaryButton label="Add entry" onPress={() => openEntry()} testID="money-empty-add" />
        }
        testID="money-empty"
      />
    );
  }
  const totals = totalsOf(entries);
  return (
    <>
      <GlassSurface
        kind="glass"
        radius={Layout.radius.list}
        style={styles.totals}
        testID="money-totals">
        <Total label="Income" value={totals.income} testID="money-total-income" />
        <Total label="Spent" value={totals.expense} testID="money-total-expense" />
        <Total label="Balance" value={totals.balance} testID="money-total-balance" />
      </GlassSurface>
      <ThemedText type="footnote" themeColor="textTertiary" testID="money-totals-note">
        Totals in RSD
      </ThemedText>
      {groupByDay(entries).map((day) => (
        <View key={day.date} style={styles.day} testID={`money-day-${day.date}`}>
          <ThemedText type="listHeader">{day.date}</ThemedText>
          <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.rows}>
            {day.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                names={names}
                owner={
                  showOwner
                    ? entry.space === 'private'
                      ? 'Private'
                      : (owners.get(entry.businessId ?? '') ?? 'Business')
                    : null
                }
                source={owners.get(entry.businessId ?? '') ?? 'Business'}
              />
            ))}
          </GlassSurface>
        </View>
      ))}
    </>
  );
}

function Total({ label, value, testID }: { label: string; value: number; testID: string }) {
  return (
    <View style={styles.total} testID={testID}>
      <ThemedText type="footnote" themeColor="textTertiary">
        {label}
      </ThemedText>
      <ThemedText
        type="headline"
        themeColor={value < 0 ? 'danger' : 'text'}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {formatWhole(value)}
      </ThemedText>
    </View>
  );
}

function EntryRow({
  entry,
  names,
  owner,
  source,
}: {
  entry: Entry;
  names: Map<string, string>;
  owner: string | null;
  /** The business a payout comes from. */
  source: string;
}) {
  const title =
    entry.kind === 'payout'
      ? `Payout ${source} → Private`
      : (names.get(entry.categoryId ?? '') ?? 'Split');
  // A payout is an inflow in Private and an outflow of Business.
  const outflow =
    entry.kind === 'expense' || (entry.kind === 'payout' && entry.space === 'business');
  const amount = `${outflow ? '−' : '+'}${formatMinor(entry.amountMinor, entry.currency)}`;
  return (
    <Pressable
      role="button"
      aria-label={`${title}, ${amount}`}
      onPress={() => openEntry(entry.id)}
      testID={`money-entry-${entry.id}`}
      style={styles.entry}>
      <View style={styles.entryText}>
        <ThemedText>{title}</ThemedText>
        {owner || entry.note ? (
          <ThemedText type="footnote" themeColor="textTertiary">
            {[owner, entry.note].filter(Boolean).join(' · ')}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.amounts}>
        <ThemedText>{amount}</ThemedText>
        {entry.currency !== 'RSD' ? (
          <ThemedText type="footnote" themeColor="textTertiary">
            {formatMinor(entry.amountRsdMinor)}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  width: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.two },
  content: { gap: Spacing.three },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  arrow: {
    minWidth: Layout.minTouchAndroid,
    minHeight: Layout.minTouchAndroid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  total: { flex: 1, gap: Spacing.one },
  day: { gap: Spacing.two },
  rows: { paddingHorizontal: Spacing.three },
  entry: {
    minHeight: Layout.minTouchAndroid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  entryText: { flex: 1 },
  amounts: { alignItems: 'flex-end' },
});
