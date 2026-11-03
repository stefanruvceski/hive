import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { HabitRow } from './habit-row';
import { SwipeRow } from './swipe-row';
import { TodoRow } from './todo-row';
import type { Habit } from '../../../data/queries';
import type { TimeOfDay } from '../../../data/schema';
import { partState } from '../../../domain/day-part';
import { isMeasurable } from '../../../domain/goal';
import { canMove, type Direction } from '../../../domain/order';
import { scheduleOf, streakOf, weeklyProgress } from '../../../domain/schedule';
import type { SwipeSide } from '../../../domain/swipe';
import type { Todo } from '../../../domain/todos';

type Props = {
  timeOfDay: TimeOfDay;
  /** Replaces `timeOfDay` in the section's testID (the "Not today" section). */
  id?: string;
  label: string;
  /** Not due today: the rows are drawn fainter. */
  dimmed?: boolean;
  /** What is logged today for the measurable habits. */
  amounts?: ReadonlyMap<string, number>;
  onOpenAmount?: (habitId: string) => void;
  /** This part of the day's to-dos for today: listed after the habits in the same card. */
  todos?: readonly Todo[];
  onToggleTodo?: (id: string, done: boolean) => void;
  onEditTodo?: (id: string) => void;
  onDeleteTodo?: (id: string) => void;
  /** The hour now (0-23): marks this part "Now", or "Earlier" if it is over with things left. */
  hour?: number;
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

// A new to-do drops in from above and the rows under it slide down; Reduce Motion turns it off.
const dropIn = FadeInDown.duration(450)
  .withInitialValues({ opacity: 0, transform: [{ translateY: -64 }] })
  .reduceMotion(ReduceMotion.System);
const fadeOut = FadeOut.duration(200).reduceMotion(ReduceMotion.System);
const slide = LinearTransition.duration(300).reduceMotion(ReduceMotion.System);

/** The streak, the weekly progress, and the goal with today's amount, of one habit's row. */
function rowFacts(habit: Habit, done: ReadonlySet<string>, today: string, amount?: number) {
  const schedule = scheduleOf(habit);
  const streak = streakOf(schedule, done, today);
  const week = schedule.type === 'weekly' ? weeklyProgress(schedule, done, today) : undefined;
  const target = isMeasurable(habit) ? (habit.target ?? 0) : undefined;
  return {
    streak: streak.value,
    streakUnit: streak.unit,
    note: week ? `${week.done} of ${week.times} this week` : undefined,
    goal: target === undefined ? undefined : { target, amount },
    quit: habit.quit,
  };
}

/** A part of the day and its habits: a header over a glass list, as the Settings list groups. */
export function HabitSection({
  timeOfDay,
  id,
  label,
  dimmed = false,
  amounts,
  onOpenAmount,
  todos = [],
  onToggleTodo,
  onEditTodo,
  onDeleteTodo,
  hour,
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
  // The clock only marks real parts of the day, not the faint "Not today" section.
  const state = hour === undefined || dimmed ? null : partState(timeOfDay, hour);
  const openCount =
    habits.filter((habit) => !(doneDates.get(habit.id) ?? none).has(today)).length +
    todos.filter((todo) => !todo.done).length;

  return (
    <Animated.View
      layout={slide}
      style={styles.section}
      testID={`habits-section-${id ?? timeOfDay}`}>
      <View style={[styles.headerRow, styles.inset]}>
        <ThemedText type="listHeader" role="heading">
          {label}
        </ThemedText>
        {state === 'now' && (
          <View
            style={[styles.pill, { backgroundColor: theme.accent }]}
            testID={`habits-section-${id ?? timeOfDay}-now`}>
            <ThemedText type="footnote" style={{ color: theme.onAccent }}>
              Now
            </ThemedText>
          </View>
        )}
        {state === 'earlier' && openCount > 0 && (
          <ThemedText
            type="footnote"
            themeColor="textTertiary"
            testID={`habits-section-${id ?? timeOfDay}-earlier`}>
            {`Earlier · ${openCount} left`}
          </ThemedText>
        )}
      </View>
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
                {...rowFacts(habit, doneDates.get(habit.id) ?? none, today, amounts?.get(habit.id))}
                dimmed={dimmed}
                onOpenAmount={() => onOpenAmount?.(habit.id)}
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
        {todos.map((todo, index) => (
          <Animated.View key={todo.id} entering={dropIn} exiting={fadeOut} layout={slide}>
            {(habits.length > 0 || index > 0) && (
              <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            )}
            <SwipeRow
              open={open?.habitId === `todo-${todo.id}` ? open.side : null}
              onOpenChange={(side) => onOpenChange(`todo-${todo.id}`, side)}
              onEdit={() => onEditTodo?.(todo.id)}
              onArchive={() => onDeleteTodo?.(todo.id)}
              archiveLabel="Delete"
              enabled={!onMove}
              name={todo.title}
              testID={`habits-swipe-todo-${todo.id}`}>
              <TodoRow
                todo={todo}
                onToggle={(done) => onToggleTodo?.(todo.id, done)}
                onEdit={onMove ? undefined : () => onEditTodo?.(todo.id)}
                onDelete={onMove ? undefined : () => onDeleteTodo?.(todo.id)}
              />
            </SwipeRow>
          </Animated.View>
        ))}
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Layout.radius.list,
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
