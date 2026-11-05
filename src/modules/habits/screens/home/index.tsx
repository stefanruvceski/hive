import { router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
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
import type { SwipeSide } from '@/utils/swipe';

import { AmountSheet } from './components/amount-sheet';
import { HabitSection, type SectionItem } from './components/habit-section';
import { OverdueCard } from './components/overdue-card';
import { StarterSuggestions } from './components/starter-suggestions';
import { TextButton } from './components/text-button';
import { TodoAdd } from './components/todo-add';
import { TodoEditSheet } from './components/todo-edit-sheet';
import { UndoBar } from './components/undo-bar';
import {
  DragLayer,
  type HostView,
  ListDragProvider,
  useListDragController,
} from './drag/list-drag';
import {
  type CompletionChange,
  useArchivedHabits,
  useArchiveHabit,
  useCompletions,
  useCreateHabit,
  useHabits,
  useRestoreHabit,
  useSetAmount,
  useSetCompletion,
} from '../../data/queries';
import { useReorder } from '../../data/reorder-queries';
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
import { newHabitId, timeOfDayOptions } from '../../domain/habits';
import {
  applyDrop,
  type Change,
  type DropTarget,
  moveBy,
  orderRows,
  type Row,
} from '../../domain/reorder';
import { isScheduled, scheduleOf } from '../../domain/schedule';
import { pickSuggestions } from '../../domain/suggestions';
import { overdue, todosFor } from '../../domain/todos';

const addHabit = () => router.push('/habits/new');
const openMood = () => router.push('/habits/mood');
const editHabit = (id: string) => router.push({ pathname: '/habits/[id]', params: { id } });
const openArchived = () => router.push('/habits/archived');
const openReminders = () => router.push('/habits/reminders');
const openBackup = () => router.push('/habits/backup');
const openMonth = () => router.push('/habits/month');
const openYear = () => router.push('/habits/year');

/** Habits' entry screen: the habits grouped by part of the day. Header as in Settings. */
export function HabitsHome() {
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
          </View>
        </View>
        <HabitsContent />
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
function HabitsContent() {
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
  const reorder = useReorder();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<HostView>(null);
  const archive = useArchiveHabit();
  const restore = useRestoreHabit();
  const createHabit = useCreateHabit();
  // The last archive/delete, offered to take back for a few seconds.
  const [undo, setUndo] = useState<{ message: string; run: () => void } | null>(null);
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
  const removeTodoItem = (id: string) => {
    const todo = todos.data?.find((item) => item.id === id);
    deleteTodo.mutate(id, {
      ...retryTodo(() => removeTodoItem(id)),
      onSuccess: () => {
        if (!todo) return;
        const { title, date, timeOfDay } = todo;
        setUndo({
          message: 'To-do deleted',
          run: () => addTodo.mutate({ id, title, date, timeOfDay }),
        });
      },
    });
  };
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

  // Optimistic like the checks; a failed write rolls back and offers a retry.
  const saveOrder = (changes: Change[]) =>
    reorder.mutate(changes, {
      onError: () =>
        Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => saveOrder(changes) },
        ]),
    });

  const archiveHabit = (id: string) =>
    archive.mutate(id, {
      onSuccess: () => setUndo({ message: 'Habit archived', run: () => restore.mutate(id) }),
      onError: () =>
        Alert.alert("Couldn't archive", 'The habit was not archived. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => archiveHabit(id) },
        ]),
    });

  const addSuggestions = async (ids: ReadonlySet<string>) => {
    try {
      // One after the other, so they keep the order they were offered in.
      for (const habit of pickSuggestions(ids)) await createHabit.mutateAsync(habit);
    } catch {
      Alert.alert("Couldn't add", 'The habits were not added. Please try again.');
    }
  };

  const undoBar = undo && (
    <UndoBar
      message={undo.message}
      onUndo={() => {
        undo.run();
        setUndo(null);
      }}
      onDismiss={() => setUndo(null)}
    />
  );

  const archivedLink = (
    <>
      <TextButton label="Reminders" onPress={openReminders} testID="habits-reminders-link" />
      <TextButton label="Backup" onPress={openBackup} testID="habits-backup-link" />
      {hasArchived && (
        <TextButton label="Archived habits" onPress={openArchived} testID="habits-archived-link" />
      )}
    </>
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
  // Habits and to-dos are one list: every habit and to-do has a place in it, the ones on screen
  // today are the visible rows. Habits not due today go to a faint section at the end.
  const dueIds = new Set(
    (data ?? []).filter((habit) => isScheduled(scheduleOf(habit), today)).map((habit) => habit.id),
  );
  const todayIds = new Set(todayTodos.map((todo) => todo.id));
  const rows: Row[] = [
    ...(data ?? []).map((habit) => ({
      kind: 'habit' as const,
      id: habit.id,
      timeOfDay: habit.timeOfDay,
      position: habit.position,
      visible: dueIds.has(habit.id),
    })),
    ...(todos.data ?? []).map((todo) => ({
      kind: 'todo' as const,
      id: todo.id,
      timeOfDay: todo.timeOfDay,
      position: todo.position,
      visible: todayIds.has(todo.id),
    })),
  ];
  const drop = (key: string, target: DropTarget) => {
    const changes = applyDrop(rows, key, target);
    if (changes.length > 0) saveOrder(changes);
  };
  const drag = useListDragController({ scrollRef, contentRef, onDrop: drop });
  const moves = {
    can: (key: string, delta: -1 | 1) => moveBy(rows, key, delta) !== null,
    by: (key: string, delta: -1 | 1) => {
      const target = moveBy(rows, key, delta);
      if (target) drop(key, target);
    },
  };

  if (data && (data.length > 0 || todayTodos.length > 0 || overdueTodos.length > 0)) {
    const doneDates = doneDatesFor(data, completions.data ?? []);
    const amounts = new Map(
      (completions.data ?? [])
        .filter((row) => row.date === today && row.amount != null)
        .map((row) => [row.habitId, row.amount ?? 0]),
    );
    const notToday = data.filter((habit) => !dueIds.has(habit.id));
    const hour = new Date().getHours();
    const sheetTodo = todayTodos.find((item) => item.id === editingTodo);
    const sheetHabit = data.find((habit) => habit.id === amountFor);
    // Each part of the day: its habits due today and its to-dos for today, in list order. While a
    // row is lifted the empty parts show too, as places to drop it.
    const habitsById = new Map(data.map((habit) => [habit.id, habit]));
    const todosById = new Map(todayTodos.map((todo) => [todo.id, todo]));
    const visibleRows = orderRows(rows).filter((row) => row.visible);
    const parts = timeOfDayOptions
      .map(({ value, label }) => ({
        timeOfDay: value,
        label,
        items: visibleRows.flatMap((row): SectionItem[] => {
          if (row.timeOfDay !== value) return [];
          const habit = row.kind === 'habit' ? habitsById.get(row.id) : undefined;
          const todo = row.kind === 'todo' ? todosById.get(row.id) : undefined;
          return habit ? [{ kind: 'habit', habit }] : todo ? [{ kind: 'todo', todo }] : [];
        }),
      }))
      .filter((part) => part.items.length > 0 || drag.active !== null);
    const section = {
      doneDates,
      today,
      amounts,
      onToggle: (habitId: string, done: boolean) => save({ habitId, date: today, done }),
      onEdit: editHabit,
      onArchive: archiveHabit,
      onOpenAmount: setAmountFor,
      open,
      onOpenChange: (habitId: string, side: SwipeSide | null) =>
        setOpen(side ? { habitId, side } : null),
    };
    return (
      <ListDragProvider value={drag}>
        <ScrollView
          ref={scrollRef}
          scrollEnabled={drag.scrollEnabled}
          onScroll={drag.onScroll}
          scrollEventThrottle={16}
          // Add (and the part-of-day picker) work with the first tap while the keyboard is open.
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.width, { paddingBottom: insets.bottom + Spacing.five }]}
          testID="habits-list">
          <View ref={contentRef} collapsable={false} style={styles.list}>
            <Title />
            {/* The same space under it as between two sections (a section's bottom margin). */}
            <View style={styles.top}>
              <TodoAdd onAdd={addNewTodo} />
              <OverdueCard
                todos={overdueTodos}
                onMoveToToday={moveTodoToToday}
                onDone={(id) => saveTodoDone(id, true)}
                onDelete={removeTodoItem}
              />
            </View>
            {parts.map((part) => (
              <HabitSection
                key={part.timeOfDay}
                {...part}
                {...section}
                moves={moves}
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
                items={notToday.map((habit) => ({ kind: 'habit', habit }))}
                dimmed
                {...section}
              />
            )}
            <DragLayer />
          </View>
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
        {undoBar}
      </ListDragProvider>
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
              <>
                <PrimaryButton label="Add habit" onPress={addHabit} testID="habits-empty-add" />
                <StarterSuggestions onAdd={addSuggestions} />
              </>
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
      {undoBar}
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
  top: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  title: {
    marginHorizontal: Spacing.one,
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
});
