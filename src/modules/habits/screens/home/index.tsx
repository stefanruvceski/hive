import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

import { AmountSheet } from './components/amount-sheet';
import { HabitSection } from './components/habit-section';
import { OverdueCard } from './components/overdue-card';
import { TextButton } from './components/text-button';
import { TodoAdd } from './components/todo-add';
import { TodoEditSheet } from './components/todo-edit-sheet';
import {
  type CompletionChange,
  useArchivedHabits,
  useArchiveHabit,
  useCompletions,
  useHabits,
  useMoveHabit,
  useSetAmount,
  useSetCompletion,
} from '../../data/queries';
import type { TimeOfDay } from '../../data/schema';
import {
  useAddTodo,
  useDeleteTodo,
  useMoveTodo,
  useToggleTodo,
  useTodos,
  useUpdateTodo,
} from '../../data/todo-queries';
import { doneDatesFor } from '../../domain/goal';
import { groupByTimeOfDay, newHabitId, timeOfDayOptions } from '../../domain/habits';
import type { Direction } from '../../domain/order';
import { isScheduled, scheduleOf } from '../../domain/schedule';
import type { SwipeSide } from '../../domain/swipe';
import { overdue, todosByTimeOfDay, todosFor } from '../../domain/todos';

const addHabit = () => router.push('/habits/new');
const openMood = () => router.push('/habits/mood');
const editHabit = (id: string) => router.push({ pathname: '/habits/[id]', params: { id } });
const openArchived = () => router.push('/habits/archived');
const openMonth = () => router.push('/habits/month');
const openYear = () => router.push('/habits/year');

/** Habits' entry screen: the habits grouped by part of the day. Header as in Settings. */
export function HabitsHome() {
  const [reordering, setReordering] = useState(false);
  const habits = useHabits();
  const hasHabits = (habits.data?.length ?? 0) > 0;

  return (
    <Wallpaper style={styles.container} testID="habits-screen">
      {/* No bottom edge: the list scrolls to the screen edge and clears the home indicator with
          padding instead (review-lessons L-004). */}
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={[styles.header, styles.width]}>
          <GlassButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            label="Back"
            onPress={() => router.back()}
            testID="habits-back"
          />
          <View style={styles.actions}>
            {reordering ? (
              <PrimaryButton
                label="Done"
                size="compact"
                onPress={() => setReordering(false)}
                testID="habits-reorder-done"
              />
            ) : (
              <>
                {hasHabits && (
                  <GlassButton
                    icon={{ ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' }}
                    label="Reorder habits"
                    onPress={() => setReordering(true)}
                    testID="habits-reorder-toggle"
                  />
                )}
                <GlassButton
                  icon={{ ios: 'face.smiling', android: 'mood', web: 'mood' }}
                  label="Mood"
                  onPress={openMood}
                  testID="habits-mood-open"
                />
                <GlassButton
                  icon={{ ios: 'square.grid.3x3', android: 'grid_view', web: 'grid_view' }}
                  label="Month"
                  onPress={openMonth}
                  testID="habits-month"
                />
                <GlassButton
                  icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
                  label="Year"
                  onPress={openYear}
                  testID="habits-year"
                />
                <GlassButton
                  icon={{ ios: 'plus', android: 'add', web: 'add' }}
                  label="Add habit"
                  onPress={addHabit}
                  testID="habits-add"
                />
              </>
            )}
          </View>
        </View>
        <HabitsContent reordering={reordering} />
      </SafeAreaView>
    </Wallpaper>
  );
}

function Title() {
  return (
    <ThemedText type="title" role="heading" style={styles.title} testID="habits-title">
      Habits
    </ThemedText>
  );
}

// Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3). The list
// needs both the habits and the days they were done.
function HabitsContent({ reordering }: { reordering: boolean }) {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const habits = useHabits();
  const completions = useCompletions();
  const setCompletion = useSetCompletion();
  const logAmount = useSetAmount();
  const todos = useTodos(today);
  const addTodo = useAddTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();
  const moveTodo = useMoveTodo();
  const updateTodo = useUpdateTodo();
  // The to-do whose edit sheet is open.
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  // The measurable habit whose amount sheet is open.
  const [amountFor, setAmountFor] = useState<string | null>(null);
  const move = useMoveHabit();
  const archive = useArchiveHabit();
  // One row shows its swipe buttons at a time.
  const [open, setOpen] = useState<{ habitId: string; side: SwipeSide } | null>(null);
  const archived = useArchivedHabits();
  const hasArchived = (archived.data?.length ?? 0) > 0;

  // Optimistic: the check flips at once and rolls back on failure, then offers a retry (07 §2).
  const save = (change: CompletionChange) =>
    setCompletion.mutate(change, {
      onError: () =>
        Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => save(change) },
        ]),
    });

  // Optimistic like the check; a failed write rolls back and offers a retry.
  const saveAmount = (habitId: string, amount: number | null) => {
    setAmountFor(null);
    logAmount.mutate(
      { habitId, date: today, amount },
      {
        onError: () =>
          Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try again', onPress: () => saveAmount(habitId, amount) },
          ]),
      },
    );
  };

  // To-do changes are optimistic like the checks: a failure rolls back and offers a retry.
  const retryTodo = (again: () => void) => ({
    onError: () =>
      Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
        { text: 'Cancel', style: 'cancel' as const },
        { text: 'Try again', onPress: again },
      ]),
  });
  const saveTodoDone = (id: string, done: boolean) =>
    toggleTodo.mutate(
      { id, done },
      retryTodo(() => saveTodoDone(id, done)),
    );
  const removeTodoItem = (id: string) =>
    deleteTodo.mutate(
      id,
      retryTodo(() => removeTodoItem(id)),
    );
  const moveTodoToToday = (id: string) =>
    moveTodo.mutate(
      { id, date: today },
      retryTodo(() => moveTodoToToday(id)),
    );
  const saveTodoEdit = (id: string, edit: { title: string; timeOfDay: TimeOfDay }) => {
    setEditingTodo(null);
    updateTodo.mutate(
      { id, ...edit },
      retryTodo(() => saveTodoEdit(id, edit)),
    );
  };
  const addNewTodo = (draft: { title: string; timeOfDay: TimeOfDay }) => {
    const todo = { id: newHabitId(), date: today, ...draft };
    addTodo.mutate(
      todo,
      retryTodo(() => addNewTodo(draft)),
    );
  };

  const moveHabit = (id: string, direction: Direction) =>
    move.mutate(
      { id, direction },
      {
        onError: () =>
          Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try again', onPress: () => moveHabit(id, direction) },
          ]),
      },
    );

  const archiveHabit = (id: string) =>
    archive.mutate(id, {
      onError: () =>
        Alert.alert("Couldn't archive", 'The habit was not archived. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => archiveHabit(id) },
        ]),
    });

  const archivedLink = hasArchived && (
    <TextButton label="Archived habits" onPress={openArchived} testID="habits-archived-link" />
  );

  const data = habits.data && completions.data ? habits.data : undefined;
  const error = habits.error ?? completions.error;
  const isError = !data && (habits.isError || completions.isError);
  const refetch = () => {
    void habits.refetch();
    void completions.refetch();
  };

  const todayTodos = todosFor(todos.data ?? [], today);
  const overdueTodos = overdue(todos.data ?? [], today);
  if (data && (data.length > 0 || todayTodos.length > 0 || overdueTodos.length > 0)) {
    const doneDates = doneDatesFor(data, completions.data ?? []);
    const amounts = new Map(
      (completions.data ?? [])
        .filter((row) => row.date === today && row.amount != null)
        .map((row) => [row.habitId, row.amount ?? 0]),
    );
    // Habits not due today go to a faint section at the end; reordering shows them all in place.
    const due = reordering ? data : data.filter((habit) => isScheduled(scheduleOf(habit), today));
    const notToday = reordering ? [] : data.filter((habit) => !due.includes(habit));
    const hour = new Date().getHours();
    const sheetTodo = todayTodos.find((item) => item.id === editingTodo);
    const sheetHabit = data.find((habit) => habit.id === amountFor);
    // Each part of the day: its habits due today and its to-dos for today.
    const dueByPart = new Map(groupByTimeOfDay(due).map((group) => [group.timeOfDay, group]));
    const todosByPart = todosByTimeOfDay(reordering ? [] : todayTodos);
    const parts = timeOfDayOptions
      .map(({ value, label }) => ({
        timeOfDay: value,
        label,
        habits: dueByPart.get(value)?.habits ?? [],
        todos: todosByPart.get(value) ?? [],
      }))
      .filter((part) => part.habits.length + part.todos.length > 0);
    const section = {
      doneDates,
      today,
      amounts,
      onToggle: (habitId: string, done: boolean) => save({ habitId, date: today, done }),
      onMove: reordering ? moveHabit : undefined,
      onEdit: editHabit,
      onArchive: archiveHabit,
      onOpenAmount: setAmountFor,
      open,
      onOpenChange: (habitId: string, side: SwipeSide | null) =>
        setOpen(side ? { habitId, side } : null),
    };
    return (
      <ScrollView
        // Add (and the part-of-day picker) work with the first tap while the keyboard is open.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.width,
          styles.list,
          { paddingBottom: insets.bottom + Spacing.five },
        ]}
        testID="habits-list">
        <Title />
        {!reordering && <TodoAdd onAdd={addNewTodo} />}
        {!reordering && (
          <OverdueCard
            todos={overdueTodos}
            onMoveToToday={moveTodoToToday}
            onDone={(id) => saveTodoDone(id, true)}
            onDelete={removeTodoItem}
          />
        )}
        {parts.map((part) => (
          <HabitSection
            key={part.timeOfDay}
            {...part}
            {...section}
            onToggleTodo={saveTodoDone}
            onEditTodo={setEditingTodo}
            onDeleteTodo={removeTodoItem}
            hour={hour}
          />
        ))}
        {notToday.length > 0 && (
          <HabitSection
            timeOfDay="anytime"
            id="not-today"
            label="Not today"
            habits={notToday}
            dimmed
            {...section}
          />
        )}
        {sheetHabit && (
          <AmountSheet
            key={sheetHabit.id}
            visible
            title={sheetHabit.name}
            unit={sheetHabit.unit}
            target={sheetHabit.target ?? 0}
            amount={amounts.get(sheetHabit.id)}
            onSave={(amount) => saveAmount(sheetHabit.id, amount)}
            onClear={() => saveAmount(sheetHabit.id, null)}
            onClose={() => setAmountFor(null)}
          />
        )}
        {sheetTodo && (
          <TodoEditSheet
            key={sheetTodo.id}
            visible
            title={sheetTodo.title}
            timeOfDay={sheetTodo.timeOfDay}
            onSave={(edit) => saveTodoEdit(sheetTodo.id, edit)}
            onClose={() => setEditingTodo(null)}
          />
        )}
        {archivedLink}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, styles.width, { paddingBottom: insets.bottom }]}>
      <Title />
      {data ? (
        <>
          <TodoAdd onAdd={addNewTodo} />
          <EmptyState
            title="No habits yet"
            description="Add the first thing you want to do every day."
            action={
              <PrimaryButton label="Add habit" onPress={addHabit} testID="habits-empty-add" />
            }
            testID="habits-empty"
          />
          {archivedLink}
        </>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} testID="habits-error" />
      ) : (
        <LoadingState testID="habits-loading" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  width: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  title: {
    marginHorizontal: Spacing.one,
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
});
