import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useThemeName } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';

import { HabitFilter } from './habit-filter';
import { YearHeatmap } from './heatmap';
import { type YearData, useYear } from '../../data/year-queries';
import { amountFractions, countingCompletions, isMeasurable } from '../../domain/goal';
import { weekdayNames, yearInsights, yearSummary } from '../../domain/year';
import { habitColor } from '../../habit-color';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Habits' year dashboard: a heatmap of every day and a few insights. Read-only. */
export function HabitsYear() {
  const today = useToday();
  const currentYear = Number(today.slice(0, 4));
  const [chosen, setChosen] = useState<number | null>(null);
  const year = Math.min(chosen ?? currentYear, currentYear);

  return (
    <Wallpaper style={styles.container} testID="habits-year-screen">
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.width}>
          <ScreenHeader
            title="Year"
            onBack={() => router.back()}
            backTestID="habits-year-back"
            titleTestID="habits-year-title"
          />
        </View>
        <YearContent
          year={year}
          today={today}
          onPrevious={() => setChosen(year - 1)}
          onNext={year < currentYear ? () => setChosen(year + 1) : undefined}
        />
      </SafeAreaView>
    </Wallpaper>
  );
}

function YearSwitcher({
  year,
  onPrevious,
  onNext,
}: {
  year: number;
  onPrevious: () => void;
  onNext?: () => void;
}) {
  return (
    <View style={styles.switcher}>
      <SwitchButton
        label="Previous year"
        glyph="‹"
        onPress={onPrevious}
        testID="habits-year-prev"
      />
      <ThemedText type="headline" role="heading" testID="habits-year-label">
        {year}
      </ThemedText>
      <SwitchButton label="Next year" glyph="›" onPress={onNext} testID="habits-year-next" />
    </View>
  );
}

function SwitchButton({
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
      style={[styles.switchButton, !onPress && styles.disabled]}>
      <ThemedText type="headline" themeColor="accentText" aria-hidden>
        {glyph}
      </ThemedText>
    </Pressable>
  );
}

// Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3).
function YearContent({
  year,
  today,
  onPrevious,
  onNext,
}: {
  year: number;
  today: string;
  onPrevious: () => void;
  onNext?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const query = useYear(year);
  // null = all habits; kept while switching years.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.width,
        styles.content,
        { paddingBottom: insets.bottom + Spacing.five },
      ]}
      testID="habits-year-content">
      <YearSwitcher year={year} onPrevious={onPrevious} onNext={onNext} />
      {query.data ? (
        <Dashboard
          year={year}
          today={today}
          data={query.data}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          testID="habits-year-error"
        />
      ) : (
        <LoadingState testID="habits-year-loading" />
      )}
    </ScrollView>
  );
}

function Dashboard({
  year,
  today,
  data,
  selectedId,
  onSelect,
}: {
  year: number;
  today: string;
  data: YearData;
  selectedId: string | null;
  onSelect: (habitId: string | null) => void;
}) {
  const scheme = useThemeName();
  const selected = data.habits.find((habit) => habit.id === selectedId);
  // A measurable habit counts on the days it reached its target.
  const counted = countingCompletions(data.habits, data.completions);
  const shown = selected
    ? {
        habits: [selected],
        completions: counted.filter(({ habitId }) => habitId === selected.id),
      }
    : { habits: data.habits, completions: counted };
  const insights = yearInsights({ year, today, ...shown });
  // One measurable habit: its heatmap also shows the days that fell short of the target.
  const fractions =
    selected && isMeasurable(selected)
      ? amountFractions(
          selected.target ?? 0,
          data.completions.filter(({ habitId }) => habitId === selected.id),
          selected.quit ?? false,
        )
      : undefined;
  // One habit alone needs no filter.
  const filter =
    data.habits.length > 1 ? (
      <HabitFilter habits={data.habits} selectedId={selected?.id ?? null} onSelect={onSelect} />
    ) : null;

  if (insights.total === 0 && !fractions?.size) {
    return (
      <>
        {filter}
        <EmptyState
          title={selected ? `Nothing done for ${selected.name}` : `Nothing done in ${year}`}
          description={
            selected
              ? `Mark ${selected.name} done and its year fills in here.`
              : 'Mark a habit done and your year fills in here.'
          }
          testID="habits-year-empty"
        />
      </>
    );
  }

  const { total, activeDays, bestWeekday, longestStreak, mostCompleted } = insights;
  const tiles = [
    {
      id: 'total',
      value: String(total),
      caption: 'Completions',
      sentence: `${plural(total, 'completion')} in ${year}.`,
    },
    {
      id: 'active-days',
      value: String(activeDays),
      caption: 'Active days',
      sentence: `You did at least one habit on ${plural(activeDays, 'day')}.`,
    },
    bestWeekday !== null && {
      id: 'best-weekday',
      value: weekdayNames[bestWeekday]?.slice(0, 3) ?? '',
      caption: 'Best weekday',
      sentence: `Your best day of the week is ${weekdayNames[bestWeekday]}.`,
    },
    longestStreak && {
      id: 'longest-streak',
      value: `${longestStreak.length} ${longestStreak.unit === 'week' ? 'wk' : 'd'}`,
      caption: selected ? 'Longest streak' : `Longest streak · ${longestStreak.name}`,
      sentence: `Your longest streak is ${plural(longestStreak.length, longestStreak.unit ?? 'day')}, for ${longestStreak.name}.`,
    },
    !selected &&
      mostCompleted && {
        id: 'most-completed',
        value: String(mostCompleted.count),
        caption: `Most done · ${mostCompleted.name}`,
        sentence: `${mostCompleted.name} is your most completed habit, done ${plural(mostCompleted.count, 'time')}.`,
      },
  ];

  return (
    <>
      {filter}
      <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.card}>
        <YearHeatmap
          year={year}
          habitCount={data.habits.length}
          perDay={insights.perDay}
          color={selected ? habitColor(selected, scheme) : undefined}
          fractions={fractions}
          summary={yearSummary(year, total, activeDays, selected?.name)}
          focusDate={today.startsWith(`${year}-`) ? today : undefined}
        />
      </GlassSurface>
      <View style={styles.tiles}>
        {tiles.map(
          (tile) =>
            tile && (
              <GlassSurface
                key={tile.id}
                kind="glass"
                radius={Layout.radius.row}
                style={styles.tile}>
                <View accessible aria-label={tile.sentence} testID={`habits-year-${tile.id}`}>
                  <ThemedText type="headline" aria-hidden>
                    {tile.value}
                  </ThemedText>
                  <ThemedText type="footnote" themeColor="textTertiary" aria-hidden>
                    {tile.caption}
                  </ThemedText>
                </View>
              </GlassSurface>
            ),
        )}
      </View>
    </>
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
  content: { gap: Spacing.three },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  switchButton: {
    minWidth: Layout.minTouchAndroid,
    minHeight: Layout.minTouchAndroid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  card: { padding: Spacing.three },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { flexGrow: 1, flexBasis: '45%', padding: Spacing.three },
});
