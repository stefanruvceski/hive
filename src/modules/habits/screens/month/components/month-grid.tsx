import { SymbolView } from 'expo-symbols';
import { type ComponentRef, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';

import type { Habit } from '../../../data/queries';
import { amountProgress, isMeasurable, shortAmount } from '../../../domain/goal';
import { type MonthDay, cellState } from '../../../domain/month';
import { isScheduled, scheduleOf } from '../../../domain/schedule';
import { habitColor, withAlpha } from '../../../habit-color';

type Props = {
  habits: Habit[];
  days: MonthDay[];
  /** Each habit's done dates (`doneDatesByHabit`). */
  doneDates: ReadonlyMap<string, ReadonlySet<string>>;
  today: string;
  onToggle: (habitId: string, date: string, done: boolean) => void;
  /** What a measurable habit was given each day: habit id → date → amount. */
  amounts?: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** A measurable habit asks for an amount instead of toggling. */
  onOpenAmount?: (habitId: string, date: string) => void;
};

const none: ReadonlySet<string> = new Set();
// Narrower than the 48 pt row so more days fit at once; the row stays 48 pt high.
const CELL_WIDTH = 40;
const MARK = 30;
const weekdayInitials = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Habits as rows, days as columns. The names stay put while the days scroll sideways, so the grid
 * fits a narrow phone. A cell is a 48 pt touch target; future days can't be touched.
 */
export function MonthGrid({
  habits,
  days,
  doneDates,
  amounts,
  today,
  onToggle,
  onOpenAmount,
}: Props) {
  const theme = useTheme();
  const themeName = useThemeName();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewportWidth = useRef(0);

  // Opens on today, centered; a month without today starts at its first day.
  const centerOnToday = () => {
    const index = days.findIndex(({ date }) => date === today);
    const x = index < 0 ? 0 : index * CELL_WIDTH + CELL_WIDTH / 2;
    scroll.current?.scrollTo({ x: Math.max(0, x - viewportWidth.current / 2), animated: false });
  };

  return (
    <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.card}>
      <View style={styles.grid} testID="habits-month-grid">
        <View style={styles.names}>
          <View style={styles.cell} />
          {habits.map((habit) => (
            <View key={habit.id} style={[styles.cell, styles.name]}>
              <ThemedText type="footnote" themeColor="text" numberOfLines={2}>
                {habit.emoji} {habit.name}
              </ThemedText>
            </View>
          ))}
        </View>
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(event) => {
            viewportWidth.current = event.nativeEvent.layout.width;
          }}
          onContentSizeChange={centerOnToday}
          testID="habits-month-scroll">
          <View>
            <View style={styles.row}>
              {days.map(({ date, day, weekday }) => (
                <View
                  key={date}
                  style={[styles.cell, date === today && { backgroundColor: theme.accentFill }]}
                  testID={date === today ? 'habits-month-today' : undefined}>
                  <ThemedText type="footnote" themeColor="textTertiary">
                    {weekdayInitials[weekday]}
                  </ThemedText>
                  <ThemedText type="footnote" themeColor={date === today ? 'accentText' : 'text'}>
                    {day}
                  </ThemedText>
                </View>
              ))}
            </View>
            {habits.map((habit) => (
              <View key={habit.id} style={styles.row}>
                {days.map(({ date, day }) => {
                  const state = cellState(date, doneDates.get(habit.id) ?? none, today);
                  const done = state === 'done';
                  // A day off is fainter but can still be marked.
                  const off = !done && !isScheduled(scheduleOf(habit), date);
                  // A measurable day short of its target shows the amount and how far it got.
                  const amount = isMeasurable(habit)
                    ? amounts?.get(habit.id)?.get(date)
                    : undefined;
                  const partial = !done && amount !== undefined;
                  const color = habitColor(habit, themeName);
                  return (
                    <Pressable
                      key={date}
                      role="checkbox"
                      aria-checked={done}
                      aria-disabled={state === 'future'}
                      aria-label={`${habit.name}, day ${day}`}
                      disabled={state === 'future'}
                      onPress={() =>
                        isMeasurable(habit)
                          ? onOpenAmount?.(habit.id, date)
                          : onToggle(habit.id, date, !done)
                      }
                      testID={`habits-month-cell-${habit.id}-${date}`}
                      style={[
                        styles.cell,
                        date === today && { backgroundColor: theme.accentFill },
                      ]}>
                      {({ pressed }) => (
                        <View
                          style={[
                            styles.mark,
                            { borderColor: color },
                            done && { backgroundColor: color },
                            (state === 'future' || off) && styles.future,
                            pressed && styles.pressed,
                          ]}>
                          {partial && !habit.quit && (
                            <View
                              style={[
                                styles.fill,
                                {
                                  backgroundColor: withAlpha(color, 0.4),
                                  height: `${amountProgress(amount, habit.target ?? 0) * 100}%`,
                                },
                              ]}
                            />
                          )}
                          {partial && (
                            <ThemedText
                              type="footnote"
                              themeColor={habit.quit ? 'danger' : 'text'}
                              numberOfLines={1}>
                              {shortAmount(amount)}
                            </ThemedText>
                          )}
                          {done && (
                            <SymbolView
                              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                              size={Layout.control.glyph}
                              tintColor={theme.background}
                            />
                          )}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
  },
  names: {
    width: Layout.minTouchAndroid * 2,
    paddingStart: Spacing.three,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_WIDTH,
    height: Layout.minTouchAndroid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    width: '100%',
    alignItems: 'flex-start',
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: Spacing.two,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
  },
  future: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.6,
  },
});
