import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

import { YearHeatmap } from './heatmap';
import { type YearData, useYear } from '../../data/year-queries';
import { weekdayNames, yearInsights, yearSummary } from '../../domain/year';

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
        <View style={[styles.width, styles.header]}>
          <GlassButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            label="Back"
            onPress={() => router.back()}
            testID="habits-year-back"
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

  return (
    <ScrollView
      contentContainerStyle={[
        styles.width,
        styles.content,
        { paddingBottom: insets.bottom + Spacing.five },
      ]}
      testID="habits-year-content">
      <ThemedText type="title" role="heading" style={styles.title}>
        Year
      </ThemedText>
      <YearSwitcher year={year} onPrevious={onPrevious} onNext={onNext} />
      {query.data ? (
        <Dashboard year={year} today={today} data={query.data} />
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

function Dashboard({ year, today, data }: { year: number; today: string; data: YearData }) {
  const insights = yearInsights({ year, today, ...data });
  if (insights.total === 0) {
    return (
      <EmptyState
        title={`Nothing done in ${year}`}
        description="Mark a habit done and your year fills in here."
        testID="habits-year-empty"
      />
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
      value: `${longestStreak.length} d`,
      caption: `Longest streak · ${longestStreak.name}`,
      sentence: `Your longest streak is ${plural(longestStreak.length, 'day')}, for ${longestStreak.name}.`,
    },
    mostCompleted && {
      id: 'most-completed',
      value: String(mostCompleted.count),
      caption: `Most done · ${mostCompleted.name}`,
      sentence: `${mostCompleted.name} is your most completed habit, done ${plural(mostCompleted.count, 'time')}.`,
    },
  ];

  return (
    <>
      <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.card}>
        <YearHeatmap
          year={year}
          habitCount={data.habits.length}
          perDay={insights.perDay}
          summary={yearSummary(year, total, activeDays)}
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
                radius={Layout.radius.list}
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
  header: { flexDirection: 'row', paddingTop: Spacing.two },
  content: { gap: Spacing.three },
  title: { marginHorizontal: Spacing.one, marginTop: Spacing.three },
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
