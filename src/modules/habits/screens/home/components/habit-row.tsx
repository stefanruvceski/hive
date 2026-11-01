import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';

import type { Habit } from '../../../data/queries';

/** One habit in its part of the day: emoji and name. Not pressable until marking done (#7). */
export function HabitRow({ habit }: { habit: Habit }) {
  return (
    <View style={styles.row} testID={`habits-item-${habit.id}`}>
      <ThemedText aria-hidden>{habit.emoji}</ThemedText>
      {/* Grows and wraps instead of running past the card (agent-rules/03 §2). */}
      <ThemedText style={styles.name}>{habit.name}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
  },
  name: {
    flex: 1,
  },
});
