import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';

import { useCategories, useEntries, useItems } from '../../data/queries';
import { formatExact, formatMinor } from '../../domain/amount';
import { monthLabel, monthOf, shiftMonth } from '../../domain/dates';
import {
  axisLabel,
  axisTicks,
  type MonthBar,
  monthSummary,
  yearSeries,
} from '../../domain/overview';
import { categoryLabel, inView } from '../../domain/owners';
import { Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';
import { useMoneyView } from '../components/use-money-view';
import { ViewChips } from '../components/view-chips';

const modes = [
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

/** Where the money went (month) and how the year moved (year), for the open view. */
export function MoneyOverview() {
  const today = useToday();
  const entries = useEntries();
  const items = useItems();
  const categories = useCategories();
  const scope = useMoneyView();
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [month, setMonth] = useState(monthOf(today));
  const mine = (entries.data ?? []).filter((entry) => inView(entry, scope.view));
  const year = Number(month.slice(0, 4));

  return (
    <MoneyScreen id="money-overview" title="Overview">
      <ViewChips view={scope.view} businesses={scope.live} onChange={scope.setView} />
      <SegmentedControl
        options={modes}
        value={mode}
        onChange={setMode}
        label="Period"
        testID="money-overview-mode"
      />
      <View style={styles.switcher}>
        <Pressable
          role="button"
          aria-label={mode === 'month' ? 'Previous month' : 'Previous year'}
          onPress={() => setMonth(shiftMonth(month, mode === 'month' ? -1 : -12))}
          testID="money-overview-prev"
          style={styles.arrow}>
          <ThemedText type="headline" themeColor="accentText" aria-hidden>
            ‹
          </ThemedText>
        </Pressable>
        <ThemedText type="headline" role="heading" testID="money-overview-label">
          {mode === 'month' ? monthLabel(month) : String(year)}
        </ThemedText>
        <Pressable
          role="button"
          aria-label={mode === 'month' ? 'Next month' : 'Next year'}
          aria-disabled={shiftMonth(month, mode === 'month' ? 1 : 12) > monthOf(today)}
          disabled={shiftMonth(month, mode === 'month' ? 1 : 12) > monthOf(today)}
          onPress={() => setMonth(shiftMonth(month, mode === 'month' ? 1 : 12))}
          testID="money-overview-next"
          style={[
            styles.arrow,
            shiftMonth(month, mode === 'month' ? 1 : 12) > monthOf(today) && styles.disabled,
          ]}>
          <ThemedText type="headline" themeColor="accentText" aria-hidden>
            ›
          </ThemedText>
        </Pressable>
      </View>
      <Gate queries={[entries, items, categories, ...scope.queries]} id="money-overview">
        {mode === 'month' ? (
          <MonthView
            entries={mine.filter((entry) => monthOf(entry.date) === month)}
            items={items.data ?? []}
            names={
              new Map(
                (categories.data ?? []).map((c) => [c.id, categoryLabel(c, scope.view === 'all')]),
              )
            }
          />
        ) : (
          <YearView bars={yearSeries(mine, year)} />
        )}
      </Gate>
    </MoneyScreen>
  );
}

function MonthView({
  entries,
  items,
  names,
}: {
  entries: Parameters<typeof monthSummary>[0];
  items: Parameters<typeof monthSummary>[1];
  names: Map<string, string>;
}) {
  const theme = useTheme();
  const summary = monthSummary(entries, items);
  if (entries.length === 0) {
    return (
      <ThemedText themeColor="textTertiary" testID="money-overview-empty">
        Nothing to show for this period yet.
      </ThemedText>
    );
  }
  return (
    <>
      <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.card}>
        <ThemedText type="footnote" themeColor="textTertiary">
          Spent
        </ThemedText>
        <ThemedText type="headline" testID="money-overview-spent">
          {formatMinor(summary.totals.expense)}
        </ThemedText>
        <ThemedText
          type="footnote"
          themeColor="textTertiary">{`Income ${formatMinor(summary.totals.income)}`}</ThemedText>
      </GlassSurface>
      <Group title="By category">
        {summary.byCategory.length === 0 ? (
          <ThemedText themeColor="textTertiary">No spending this month.</ThemedText>
        ) : (
          summary.byCategory.map((row) => (
            <View
              key={row.categoryId}
              style={styles.bar}
              testID={`money-overview-category-${row.categoryId}`}>
              <View style={styles.barTop}>
                <ThemedText>{names.get(row.categoryId) ?? 'Other'}</ThemedText>
                <ThemedText themeColor="textTertiary">{`${formatMinor(row.spent)} · ${Math.round(row.share * 100)}%`}</ThemedText>
              </View>
              <View style={[styles.track, { backgroundColor: theme.controlBorder }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${row.share * 100}%`, backgroundColor: theme.accent },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </Group>
      <Group title="Biggest expenses">
        {summary.biggest.map((entry) => (
          <View key={entry.id} style={styles.barTop}>
            <ThemedText>{names.get(entry.categoryId ?? '') ?? 'Split'}</ThemedText>
            <ThemedText>{formatExact(entry.amountRsdMinor)}</ThemedText>
          </View>
        ))}
      </Group>
    </>
  );
}

// Left gutter for the axis labels; the plot is the rest. Months are letters under the plot.
const chart = { width: 336, top: 8, plotHeight: 140, labelHeight: 18, gutter: 40, gap: 4 };
const monthLetters = 'JFMAMJJASOND'.split('');

function YearView({ bars }: { bars: MonthBar[] }) {
  const theme = useTheme();
  const ticks = axisTicks(Math.max(0, ...bars.flatMap((bar) => [bar.income, bar.expense])));
  const top = ticks[ticks.length - 1] ?? 1;
  const slot = (chart.width - chart.gutter) / 12;
  const height = (value: number) => (value / top) * chart.plotHeight;
  const total = bars.reduce(
    (acc, bar) => ({ income: acc.income + bar.income, expense: acc.expense + bar.expense }),
    { income: 0, expense: 0 },
  );
  const summary = `Income ${formatMinor(total.income)}, spent ${formatMinor(total.expense)}`;
  if (total.income === 0 && total.expense === 0) {
    return (
      <ThemedText themeColor="textTertiary" testID="money-overview-empty">
        Nothing to show for this period yet.
      </ThemedText>
    );
  }
  return (
    <>
      <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.card}>
        <View accessible aria-label={`Year chart. ${summary}`} testID="money-overview-chart">
          <Svg
            width="100%"
            height={chart.top + chart.plotHeight + chart.labelHeight}
            viewBox={`0 0 ${chart.width} ${chart.top + chart.plotHeight + chart.labelHeight}`}>
            {ticks.map((tick) => {
              const y = chart.top + chart.plotHeight - height(tick);
              return (
                <Fragment key={tick}>
                  <Line
                    x1={chart.gutter}
                    x2={chart.width}
                    y1={y}
                    y2={y}
                    stroke={theme.controlBorder}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={chart.gutter - 6}
                    y={y + 4}
                    fontSize={10}
                    textAnchor="end"
                    fill={theme.textTertiary}>
                    {axisLabel(tick)}
                  </SvgText>
                </Fragment>
              );
            })}
            {bars.map((bar, index) => {
              const x = chart.gutter + index * slot + chart.gap / 2;
              // The bars share a month's slot; the smaller one is drawn over the bigger one.
              const parts = [
                { value: bar.income, fill: theme.accent },
                { value: bar.expense, fill: theme.danger },
              ].sort((p, q) => q.value - p.value);
              return (
                <Fragment key={bar.month}>
                  {parts.map((part) => (
                    <Rect
                      key={part.fill}
                      x={x}
                      y={chart.top + chart.plotHeight - height(part.value)}
                      width={slot - chart.gap}
                      height={height(part.value)}
                      rx={2}
                      fill={part.fill}
                    />
                  ))}
                  <SvgText
                    x={x + (slot - chart.gap) / 2}
                    y={chart.top + chart.plotHeight + 14}
                    fontSize={11}
                    textAnchor="middle"
                    fill={theme.textTertiary}>
                    {monthLetters[index]}
                  </SvgText>
                </Fragment>
              );
            })}
          </Svg>
        </View>
        <View style={styles.legend}>
          <ThemedText type="footnote" themeColor="accentText">
            ● Income
          </ThemedText>
          <ThemedText type="footnote" themeColor="danger">
            ● Spent
          </ThemedText>
        </View>
      </GlassSurface>
      <ThemedText testID="money-overview-year-summary">{summary}</ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
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
  card: { padding: Spacing.three, gap: Spacing.one },
  bar: { gap: Spacing.one, paddingVertical: Spacing.one },
  barTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 28,
  },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', gap: Spacing.three, paddingTop: Spacing.two },
});
