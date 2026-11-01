import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';

import { HabitCheck } from './habit-check';
import type { Habit } from '../../../data/queries';

type Props = {
  habit: Habit;
  doneToday: boolean;
  streak: number;
  onToggle: (done: boolean) => void;
};

/** One habit in its part of the day: emoji, name and streak, and its "done today" check. */
export function HabitRow({ habit, doneToday, streak, onToggle }: Props) {
  return (
    <View style={styles.row} testID={`habits-item-${habit.id}`}>
      <ThemedText aria-hidden>{habit.emoji}</ThemedText>
      {/* Grows and wraps instead of running past the card (agent-rules/03 §2). */}
      <View style={styles.text}>
        <ThemedText>{habit.name}</ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary" testID={`habits-streak-${habit.id}`}>
          {`Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
        </ThemedText>
      </View>
      <HabitCheck
        checked={doneToday}
        label={`Done today: ${habit.name}`}
        onPress={() => onToggle(!doneToday)}
        testID={`habits-check-${habit.id}`}
      />
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
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
