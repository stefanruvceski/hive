import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';

import { MonthGrid } from './components/month-grid';
import {
  type MonthCompletionChange,
  useMonthCompletions,
  useSetMonthCompletion,
} from '../../data/month-queries';
import { useHabits } from '../../data/queries';
import { canShowNext, monthDays, monthOf, monthTitle, shiftMonth } from '../../domain/month';
import { doneDatesByHabit } from '../../domain/streak';

/** The month grid: every habit by every day of a month; past days can be fixed. Header as Habits. */
export function HabitsMonth() {
  const today = useToday();
  // Months back from the current one, so the grid follows `today` over midnight.
  const [monthsBack, setMonthsBack] = useState(0);
  const month = shiftMonth(monthOf(today), -monthsBack);

  return (
    <Wallpaper style={styles.container} testID="habits-month-screen">
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.width}>
          <ScreenHeader
            title={monthTitle(month)}
            onBack={() => router.back()}
            backTestID="habits-month-back"
            titleTestID="habits-month-title"
            titleStart={
              <Step direction="previous" enabled onPress={() => setMonthsBack(monthsBack + 1)} />
            }
            titleEnd={
              <Step
                direction="next"
                enabled={canShowNext(month, today)}
                onPress={() => setMonthsBack(monthsBack - 1)}
              />
            }
          />
        </View>
        <MonthContent month={month} today={today} />
      </SafeAreaView>
    </Wallpaper>
  );
}

/** Plain "previous / next month" chevron (not a round button, so it isn't mistaken for Back); 48 pt, faded and inert when disabled. */
function Step({
  direction,
  enabled,
  onPress,
}: {
  direction: 'previous' | 'next';
  enabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const previous = direction === 'previous';
  return (
    <Pressable
      role="button"
      aria-label={previous ? 'Previous month' : 'Next month'}
      aria-disabled={!enabled}
      disabled={!enabled}
      onPress={onPress}
      testID={`habits-month-${direction}`}
      style={[styles.step, !enabled && styles.disabled]}>
      <SymbolView
        name={
          previous
            ? { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }
            : { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }
        }
        size={Layout.control.glyph}
        tintColor={theme.accentText}
      />
    </Pressable>
  );
}

// Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3).
function MonthContent({ month, today }: { month: ReturnType<typeof monthOf>; today: string }) {
  const insets = useSafeAreaInsets();
  const habits = useHabits();
  const completions = useMonthCompletions(month);
  const setCompletion = useSetMonthCompletion(month);

  // Optimistic: the cell flips at once and rolls back on failure, then offers a retry (07 §2).
  const save = (change: MonthCompletionChange) =>
    setCompletion.mutate(change, {
      onError: () =>
        Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => save(change) },
        ]),
    });

  const data = habits.data && completions.data ? habits.data : undefined;
  const error = habits.error ?? completions.error;
  const isError = !data && (habits.isError || completions.isError);
  const refetch = () => {
    void habits.refetch();
    void completions.refetch();
  };

  if (data && data.length > 0) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.width,
          styles.list,
          { paddingTop: Spacing.two, paddingBottom: insets.bottom + Spacing.five },
        ]}
        testID="habits-month-list">
        <MonthGrid
          habits={data}
          days={monthDays(month)}
          doneDates={doneDatesByHabit(completions.data ?? [])}
          today={today}
          onToggle={(habitId, date, done) => save({ habitId, date, done })}
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, styles.width, { paddingBottom: insets.bottom }]}>
      {data ? (
        <EmptyState
          title="No habits yet"
          description="Add a habit to see it here, day by day."
          testID="habits-month-empty"
        />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} testID="habits-month-error" />
      ) : (
        <LoadingState testID="habits-month-loading" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  width: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
  },
  step: {
    minWidth: Layout.minTouchAndroid,
    minHeight: Layout.minTouchAndroid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  list: {
    gap: Spacing.two,
  },
});
