import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { Habit } from '../../../data/queries';
import { type MonthDay, cellState } from '../../../domain/month';

type Props = {
  habits: Habit[];
  days: MonthDay[];
  /** Each habit's done dates (`doneDatesByHabit`). */
  doneDates: ReadonlyMap<string, ReadonlySet<string>>;
  today: string;
  onToggle: (habitId: string, date: string, done: boolean) => void;
};

const none: ReadonlySet<string> = new Set();
const weekdayInitials = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Habits as rows, days as columns. The names stay put while the days scroll sideways, so the grid
 * fits a narrow phone. A cell is a 48 pt touch target; future days can't be touched.
 */
export function MonthGrid({ habits, days, doneDates, today, onToggle }: Props) {
  const theme = useTheme();

  return (
    <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.card}>
      <View style={styles.grid} testID="habits-month-grid">
        <View style={styles.names}>
          <View style={styles.cell} />
          {habits.map((habit) => (
            <View key={habit.id} style={[styles.cell, styles.name]}>
              <ThemedText type="footnote" themeColor="text" numberOfLines={1}>
                {habit.emoji} {habit.name}
              </ThemedText>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="habits-month-scroll">
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
                  return (
                    <Pressable
                      key={date}
                      role="checkbox"
                      aria-checked={done}
                      aria-disabled={state === 'future'}
                      aria-label={`${habit.name}, day ${day}`}
                      disabled={state === 'future'}
                      onPress={() => onToggle(habit.id, date, !done)}
                      testID={`habits-month-cell-${habit.id}-${date}`}
                      style={[
                        styles.cell,
                        date === today && { backgroundColor: theme.accentFill },
                      ]}>
                      {({ pressed }) => (
                        <View
                          style={[
                            styles.mark,
                            done
                              ? { backgroundColor: theme.accent, borderColor: theme.accent }
                              : {
                                  backgroundColor: theme.control,
                                  borderColor: theme.controlBorder,
                                },
                            state === 'future' && styles.future,
                            pressed && styles.pressed,
                          ]}>
                          {done && (
                            <SymbolView
                              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                              size={Layout.control.glyph}
                              tintColor={theme.onAccent}
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
    width: Layout.minTouchAndroid,
    height: Layout.minTouchAndroid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    width: '100%',
    alignItems: 'flex-start',
  },
  mark: {
    width: Layout.control.size - Spacing.two,
    height: Layout.control.size - Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  future: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.6,
  },
});
