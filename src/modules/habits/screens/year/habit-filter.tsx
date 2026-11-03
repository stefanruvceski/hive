import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';

import type { YearHabit } from '../../domain/year';
import { habitColor } from '../../habit-color';

type Props = {
  habits: readonly YearHabit[];
  /** The chosen habit, or null for all of them. */
  selectedId: string | null;
  onSelect: (habitId: string | null) => void;
};

/** "All" and a pill per habit, in its own color: what the heatmap and the tiles below show. */
export function HabitFilter({ habits, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const scheme = useThemeName();
  const options = [
    { id: null, name: 'All', color: theme.accent },
    ...habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      color: habitColor(habit, scheme),
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID="habits-year-filter">
      {options.map(({ id, name, color }) => {
        const selected = id === selectedId;
        return (
          <Pressable
            key={id ?? 'all'}
            role="radio"
            aria-checked={selected}
            aria-label={id === null ? 'All habits' : name}
            onPress={() => onSelect(id)}
            testID={`habits-year-filter-${id ?? 'all'}`}
            style={[
              styles.pill,
              selected
                ? { backgroundColor: `${color}33`, borderColor: color }
                : { backgroundColor: theme.control, borderColor: theme.controlBorder },
            ]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <ThemedText numberOfLines={1} style={styles.name}>
              {name}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  pill: {
    height: Layout.control.size,
    maxWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Layout.control.size / 2,
    borderWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    flexShrink: 1,
  },
});
