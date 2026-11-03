import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { HabitRow } from './habit-row';
import { SwipeRow } from './swipe-row';
import type { Habit } from '../../../data/queries';
import type { TimeOfDay } from '../../../data/schema';
import { canMove, type Direction } from '../../../domain/order';
import { currentStreak } from '../../../domain/streak';
import type { SwipeSide } from '../../../domain/swipe';

type Props = {
  timeOfDay: TimeOfDay;
  label: string;
  habits: Habit[];
  /** Each habit's done dates (`doneDatesByHabit`). */
  doneDates: ReadonlyMap<string, ReadonlySet<string>>;
  today: string;
  onToggle: (habitId: string, done: boolean) => void;
  /** Set in reorder mode: up/down buttons replace the checks and swiping is off. */
  onMove?: (habitId: string, direction: Direction) => void;
  onEdit: (habitId: string) => void;
  onArchive: (habitId: string) => void;
  /** The row whose swipe buttons are showing, if it is in this section. */
  open: { habitId: string; side: SwipeSide } | null;
  onOpenChange: (habitId: string, side: SwipeSide | null) => void;
};

const none: ReadonlySet<string> = new Set();

/** A part of the day and its habits: a header over a glass list, as the Settings list groups. */
export function HabitSection({
  timeOfDay,
  label,
  habits,
  doneDates,
  today,
  onToggle,
  onMove,
  onEdit,
  onArchive,
  open,
  onOpenChange,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.section} testID={`habits-section-${timeOfDay}`}>
      <ThemedText type="listHeader" role="heading" style={styles.inset}>
        {label}
      </ThemedText>
      <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.list}>
        {habits.map((habit, index) => (
          <Fragment key={habit.id}>
            {index > 0 && <View style={[styles.separator, { backgroundColor: theme.separator }]} />}
            <SwipeRow
              open={open?.habitId === habit.id ? open.side : null}
              onOpenChange={(side) => onOpenChange(habit.id, side)}
              onEdit={() => onEdit(habit.id)}
              onArchive={() => onArchive(habit.id)}
              enabled={!onMove}
              name={habit.name}
              testID={`habits-swipe-${habit.id}`}>
              <HabitRow
                habit={habit}
                doneToday={(doneDates.get(habit.id) ?? none).has(today)}
                streak={currentStreak(doneDates.get(habit.id) ?? none, today)}
                onToggle={(done) => onToggle(habit.id, done)}
                reorder={
                  onMove
                    ? {
                        canUp: canMove(habits, habit.id, 'up'),
                        canDown: canMove(habits, habit.id, 'down'),
                        onMove: (direction) => onMove(habit.id, direction),
                      }
                    : undefined
                }
                onEdit={onMove ? undefined : () => onEdit(habit.id)}
                onArchive={onMove ? undefined : () => onArchive(habit.id)}
              />
            </SwipeRow>
          </Fragment>
        ))}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  inset: {
    marginHorizontal: Layout.listRow.paddingHorizontal,
  },
  list: {
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginStart: Layout.listRow.paddingHorizontal,
  },
});
