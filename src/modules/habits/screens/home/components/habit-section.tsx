import { Fragment, type ReactNode, useRef } from 'react';
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
import { scheduleOf, streakOf, weeklyProgress } from '../../../domain/schedule';
import type { SwipeSide } from '../../../domain/swipe';
import type { Todo } from '../../../domain/todos';
import { DragRow, useDropPart } from '../drag/drag-row';
import type { HostView } from '../drag/list-drag';

/** One row of a section: a habit or a to-do, in the order the list shows. */
export type SectionItem = { kind: 'habit'; habit: Habit } | { kind: 'todo'; todo: Todo };
export const itemKey = (item: SectionItem) =>
  item.kind === 'habit' ? `habit-${item.habit.id}` : `todo-${item.todo.id}`;

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
  onToggleTodo?: (id: string, done: boolean) => void;
  onEditTodo?: (id: string) => void;
  onDeleteTodo?: (id: string) => void;
  /** The hour now (0-23): marks this part "Now", or "Earlier" if it is over with things left. */
  hour?: number;
  /** The habits and to-dos of this part, in list order. */
  items: readonly SectionItem[];
  /** Each habit's done dates (`doneDatesByHabit`). */
  doneDates: ReadonlyMap<string, ReadonlySet<string>>;
  today: string;
  onToggle: (habitId: string, done: boolean) => void;
  /** Set where rows can be dragged: lets a screen reader move a row up or down instead. */
  moves?: {
    can: (key: string, delta: -1 | 1) => boolean;
    by: (key: string, delta: -1 | 1) => void;
  };
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
  onToggleTodo,
  onEditTodo,
  onDeleteTodo,
  hour,
  items,
  doneDates,
  today,
  onToggle,
  moves,
  onEdit,
  onArchive,
  open,
  onOpenChange,
}: Props) {
  const theme = useTheme();
  const sectionRef = useRef<HostView>(null);
  const cardRef = useRef<HostView>(null);
  const dragging = useDropPart(timeOfDay, sectionRef, cardRef, moves !== undefined);
  // The clock only marks real parts of the day, not the faint "Not today" section.
  const state = hour === undefined || dimmed ? null : partState(timeOfDay, hour);
  const openCount = items.filter((item) =>
    item.kind === 'habit' ? !(doneDates.get(item.habit.id) ?? none).has(today) : !item.todo.done,
  ).length;

  const habitRow = (habit: Habit, withMoves: boolean) => {
    const key = `habit-${habit.id}`;
    return (
      <HabitRow
        habit={habit}
        doneToday={(doneDates.get(habit.id) ?? none).has(today)}
        {...rowFacts(habit, doneDates.get(habit.id) ?? none, today, amounts?.get(habit.id))}
        dimmed={dimmed}
        onOpenAmount={() => onOpenAmount?.(habit.id)}
        onToggle={(done) => onToggle(habit.id, done)}
        onEdit={() => onEdit(habit.id)}
        onArchive={() => onArchive(habit.id)}
        onMoveUp={withMoves && moves?.can(key, -1) ? () => moves.by(key, -1) : undefined}
        onMoveDown={withMoves && moves?.can(key, 1) ? () => moves.by(key, 1) : undefined}
      />
    );
  };
  const todoRow = (todo: Todo, withMoves: boolean) => {
    const key = `todo-${todo.id}`;
    return (
      <TodoRow
        todo={todo}
        onToggle={(done) => onToggleTodo?.(todo.id, done)}
        onEdit={() => onEditTodo?.(todo.id)}
        onDelete={() => onDeleteTodo?.(todo.id)}
        onMoveUp={withMoves && moves?.can(key, -1) ? () => moves.by(key, -1) : undefined}
        onMoveDown={withMoves && moves?.can(key, 1) ? () => moves.by(key, 1) : undefined}
      />
    );
  };
  // The lifted copy of a row: the row itself on a glass card.
  const ghost = (row: ReactNode) => (
    <GlassSurface kind="glass" radius={Layout.radius.list}>
      {row}
    </GlassSurface>
  );
  // Rows can be dragged where the screen offers moves (not in "Not today").
  const draggable = (key: string, row: ReactNode, node: ReactNode) =>
    moves ? (
      <DragRow dragKey={key} timeOfDay={timeOfDay} ghost={ghost(row)}>
        {node}
      </DragRow>
    ) : (
      node
    );

  return (
    <Animated.View layout={slide} testID={`habits-section-${id ?? timeOfDay}`}>
      <View ref={sectionRef} collapsable={false} style={styles.section}>
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
        <View ref={cardRef} collapsable={false}>
          <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.list}>
            {items.length === 0 && moves && (
              <View style={styles.empty} testID={`habits-section-${id ?? timeOfDay}-empty`}>
                <ThemedText type="footnote" themeColor="textTertiary">
                  Drop here
                </ThemedText>
              </View>
            )}
            {items.map((item, index) => {
              const separator = index > 0 && (
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
              );
              if (item.kind === 'habit') {
                const { habit } = item;
                const row = habitRow(habit, false);
                return (
                  <Fragment key={habit.id}>
                    {separator}
                    {draggable(
                      `habit-${habit.id}`,
                      row,
                      <SwipeRow
                        open={open?.habitId === habit.id ? open.side : null}
                        onOpenChange={(side) => onOpenChange(habit.id, side)}
                        onEdit={() => onEdit(habit.id)}
                        onArchive={() => onArchive(habit.id)}
                        enabled={!dragging}
                        name={habit.name}
                        testID={`habits-swipe-${habit.id}`}>
                        {habitRow(habit, true)}
                      </SwipeRow>,
                    )}
                  </Fragment>
                );
              }
              const { todo } = item;
              return (
                <Animated.View key={todo.id} entering={dropIn} exiting={fadeOut} layout={slide}>
                  {separator}
                  {draggable(
                    `todo-${todo.id}`,
                    todoRow(todo, false),
                    <SwipeRow
                      open={open?.habitId === `todo-${todo.id}` ? open.side : null}
                      onOpenChange={(side) => onOpenChange(`todo-${todo.id}`, side)}
                      onEdit={() => onEditTodo?.(todo.id)}
                      onArchive={() => onDeleteTodo?.(todo.id)}
                      archiveLabel="Delete"
                      enabled={!dragging}
                      name={todo.title}
                      testID={`habits-swipe-todo-${todo.id}`}>
                      {todoRow(todo, true)}
                    </SwipeRow>,
                  )}
                </Animated.View>
              );
            })}
          </GlassSurface>
        </View>
      </View>
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
  empty: {
    minHeight: Layout.listDrag.emptyHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginStart: Layout.listRow.paddingHorizontal,
  },
});
