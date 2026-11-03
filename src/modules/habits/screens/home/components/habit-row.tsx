import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useThemeName } from '@/hooks/use-theme';

import { HabitAmount } from './habit-amount';
import { HabitCheck } from './habit-check';
import type { Habit } from '../../../data/queries';
import { habitColor } from '../../../habit-color';

type Props = {
  habit: Habit;
  doneToday: boolean;
  streak: number;
  /** What the streak counts: days (default) or weeks, for a habit with a weekly target. */
  streakUnit?: 'day' | 'week';
  /** A second line under the streak: this week's progress, or today's amount. */
  note?: string;
  /** A measurable habit: its target and what is logged today; the check becomes an amount circle. */
  goal?: { target: number; amount?: number };
  onOpenAmount?: () => void;
  /** Not due today: drawn fainter. */
  dimmed?: boolean;
  /** A habit to quit: "Avoid" in front of the streak; an amount over the limit is flagged. */
  quit?: boolean;
  onToggle: (done: boolean) => void;
  /** Screen-reader alternatives to the swipe buttons and the drag. */
  onEdit?: () => void;
  onArchive?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

/** One habit in its part of the day: emoji, name and streak, and its "done today" check. */
export function HabitRow({
  habit,
  doneToday,
  streak,
  streakUnit = 'day',
  note,
  goal,
  onOpenAmount,
  dimmed = false,
  quit = false,
  onToggle,
  onEdit,
  onArchive,
  onMoveUp,
  onMoveDown,
}: Props) {
  const scheme = useThemeName();
  const actions = [
    ...(onEdit ? [{ name: 'edit', label: 'Edit' }] : []),
    ...(onArchive ? [{ name: 'archive', label: 'Archive' }] : []),
    ...(onMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
    ...(onMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
  ];
  return (
    <View style={[styles.row, dimmed && styles.dimmed]} testID={`habits-item-${habit.id}`}>
      <View style={styles.leading} aria-hidden>
        <ThemedText>{habit.emoji}</ThemedText>
      </View>
      {/* Grows and wraps instead of running past the card (agent-rules/03 §2). Swiping and dragging are not
          available to a screen reader, so Edit, Archive and Move are custom actions on the name. */}
      <View
        style={styles.text}
        accessible={actions.length > 0}
        accessibilityActions={actions}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'edit') onEdit?.();
          else if (event.nativeEvent.actionName === 'archive') onArchive?.();
          else if (event.nativeEvent.actionName === 'moveUp') onMoveUp?.();
          else if (event.nativeEvent.actionName === 'moveDown') onMoveDown?.();
        }}
        testID={`habits-item-text-${habit.id}`}>
        <ThemedText>{habit.name}</ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary" testID={`habits-streak-${habit.id}`}>
          {`${quit ? 'Avoid · ' : ''}Streak: ${streak} ${streak === 1 ? streakUnit : `${streakUnit}s`}`}
        </ThemedText>
        {note ? (
          <ThemedText type="footnote" themeColor="textSecondary" testID={`habits-note-${habit.id}`}>
            {note}
          </ThemedText>
        ) : null}
      </View>
      {goal ? (
        <HabitAmount
          color={habitColor(habit, scheme)}
          amount={goal.amount}
          target={goal.target}
          quit={quit}
          label={`Log amount: ${habit.name}`}
          onPress={() => onOpenAmount?.()}
          testID={`habits-amount-${habit.id}`}
        />
      ) : (
        <HabitCheck
          color={habitColor(habit, scheme)}
          checked={doneToday}
          label={quit ? `Held out today: ${habit.name}` : `Done today: ${habit.name}`}
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
  leading: {
    width: Layout.listRow.leading,
    alignItems: 'center',
  },
  dimmed: {
    opacity: 0.55,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
