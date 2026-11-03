import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';

import { HabitCheck } from './habit-check';
import { ReorderControls } from './reorder-controls';
import type { Habit } from '../../../data/queries';
import type { Direction } from '../../../domain/order';

type Props = {
  habit: Habit;
  doneToday: boolean;
  streak: number;
  onToggle: (done: boolean) => void;
  /** Reorder mode: the check gives way to move controls. */
  reorder?: { canUp: boolean; canDown: boolean; onMove: (direction: Direction) => void };
  /** Screen-reader alternatives to the swipe buttons. */
  onEdit?: () => void;
  onArchive?: () => void;
};

/** One habit in its part of the day: emoji, name and streak, and its "done today" check. */
export function HabitRow({
  habit,
  doneToday,
  streak,
  onToggle,
  reorder,
  onEdit,
  onArchive,
}: Props) {
  const actions = [
    ...(onEdit ? [{ name: 'edit', label: 'Edit' }] : []),
    ...(onArchive ? [{ name: 'archive', label: 'Archive' }] : []),
  ];
  return (
    <View style={styles.row} testID={`habits-item-${habit.id}`}>
      <ThemedText aria-hidden>{habit.emoji}</ThemedText>
      {/* Grows and wraps instead of running past the card (agent-rules/03 §2). Swiping is not
          available to a screen reader, so Edit and Archive are custom actions on the name. */}
      <View
        style={styles.text}
        accessible={actions.length > 0}
        accessibilityActions={actions}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'edit') onEdit?.();
          else if (event.nativeEvent.actionName === 'archive') onArchive?.();
        }}
        testID={`habits-item-text-${habit.id}`}>
        <ThemedText>{habit.name}</ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary" testID={`habits-streak-${habit.id}`}>
          {`Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
        </ThemedText>
      </View>
      {reorder ? (
        <ReorderControls habit={habit} {...reorder} />
      ) : (
        <HabitCheck
          checked={doneToday}
          label={`Done today: ${habit.name}`}
          onPress={() => onToggle(!doneToday)}
          testID={`habits-check-${habit.id}`}
        />
      )}
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
