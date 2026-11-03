import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, asc, eq, isNotNull, isNull, max } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { toIsoDate } from '@/utils/format-date';

import { habitsCompletions, habitsHabits } from './schema';
import { type AmountChange, type Goal, setAmount } from '../domain/goal';
import { type NewHabit, newHabitId, normalizeName } from '../domain/habits';
import { type Direction, endPosition, moveWithinPart } from '../domain/order';
import { type Schedule, formatDays } from '../domain/schedule';
import { type Completion, setCompletion } from '../domain/streak';

export type Habit = typeof habitsHabits.$inferSelect;

/** The columns a habit's schedule is stored in; none means daily. */
function scheduleColumns(schedule?: Schedule) {
  return {
    scheduleType: schedule?.type ?? ('daily' as const),
    scheduleDays: schedule?.type === 'weekdays' ? formatDays(schedule.days) : null,
    scheduleTimes: schedule?.type === 'weekly' ? schedule.times : null,
  };
}

/** The columns a measurable habit's goal is stored in; none means a plain yes/no habit. */
function goalColumns(goal?: Goal) {
  return {
    unit: goal?.unit.trim() || null,
    target: goal?.target ?? null,
    aggregation: goal?.aggregation ?? ('sum' as const),
  };
}

// Hierarchical key factory — every key for this module comes from here (07 §1).
export const habitsKeys = {
  all: ['habits'] as const,
  lists: () => [...habitsKeys.all, 'list'] as const,
  archived: () => [...habitsKeys.all, 'archived'] as const,
  completions: () => [...habitsKeys.all, 'completions'] as const,
};

/** Every active (not archived) habit, in list order. */
export const habitsListQuery = () =>
  queryOptions({
    queryKey: habitsKeys.lists(),
    queryFn: async (): Promise<Habit[]> =>
      getDb()
        .select()
        .from(habitsHabits)
        .where(isNull(habitsHabits.archivedAt))
        .orderBy(asc(habitsHabits.position))
        .all(),
  });

/** Archived habits, in list order. */
export const archivedHabitsQuery = () =>
  queryOptions({
    queryKey: habitsKeys.archived(),
    queryFn: async (): Promise<Habit[]> =>
      getDb()
        .select()
        .from(habitsHabits)
        .where(isNotNull(habitsHabits.archivedAt))
        .orderBy(asc(habitsHabits.position))
        .all(),
  });

export function useArchivedHabits() {
  return useQuery(archivedHabitsQuery());
}

export function useHabits() {
  return useQuery(habitsListQuery());
}

/** Adds a habit at the end of the list. Submit-and-close: the form shows `isPending`/`isError`. */
export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewHabit) => {
      const name = normalizeName(input.name);
      if (!name) throw new Error('A habit needs a name.');
      getDb().transaction((tx) => {
        const last = tx
          .select({ position: max(habitsHabits.position) })
          .from(habitsHabits)
          .get();
        tx.insert(habitsHabits)
          .values({
            id: newHabitId(),
            name,
            emoji: input.emoji,
            timeOfDay: input.timeOfDay,
            color: input.color ?? null,
            ...scheduleColumns(input.schedule),
            ...goalColumns(input.goal),
            quit: input.quit ?? false,
            position: (last?.position ?? -1) + 1,
            createdAt: toIsoDate(new Date()),
          })
          .run();
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsKeys.lists() }),
  });
}

/** Every day each habit was done. Streaks and "done today" are worked out from it in `domain/`. */
export const habitsCompletionsQuery = () =>
  queryOptions({
    queryKey: habitsKeys.completions(),
    queryFn: async (): Promise<Completion[]> => getDb().select().from(habitsCompletions).all(),
  });

export function useCompletions() {
  return useQuery(habitsCompletionsQuery());
}

export type CompletionChange = Completion & { done: boolean };

/**
 * Marks a habit done or not done on a day (the caller passes the day it shows). Optimistic: the
 * row changes at once and rolls back if the write fails.
 */
export function useSetCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date, done }: CompletionChange) => {
      if (done) {
        getDb().insert(habitsCompletions).values({ habitId, date }).onConflictDoNothing().run();
      } else {
        getDb()
          .delete(habitsCompletions)
          .where(and(eq(habitsCompletions.habitId, habitId), eq(habitsCompletions.date, date)))
          .run();
      }
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.completions() });
      const previous = queryClient.getQueryData<Completion[]>(habitsKeys.completions());
      if (previous) {
        queryClient.setQueryData(habitsKeys.completions(), setCompletion(previous, change));
      }
      return { previous };
    },
    onError: (_error, _change, context) => {
      queryClient.setQueryData(habitsKeys.completions(), context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsKeys.completions() }),
  });
}

/**
 * Logs how much of a measurable habit was done on a day; `null` clears it. Optimistic on every
 * completions query (the list and each opened month), rolls back if the write fails, and settling
 * refreshes them (streaks, Today).
 */
export function useSetAmount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date, amount }: AmountChange) => {
      if (amount === null) {
        getDb()
          .delete(habitsCompletions)
          .where(and(eq(habitsCompletions.habitId, habitId), eq(habitsCompletions.date, date)))
          .run();
        return;
      }
      getDb()
        .insert(habitsCompletions)
        .values({ habitId, date, amount })
        .onConflictDoUpdate({
          target: [habitsCompletions.habitId, habitsCompletions.date],
          set: { amount },
        })
        .run();
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.completions() });
      const previous = queryClient.getQueriesData<Completion[]>({
        queryKey: habitsKeys.completions(),
      });
      queryClient.setQueriesData<Completion[]>({ queryKey: habitsKeys.completions() }, (old) =>
        old ? setAmount(old, change) : old,
      );
      return { previous };
    },
    onError: (_error, _change, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsKeys.completions() }),
  });
}

export type HabitEdit = NewHabit & { id: string };

/** Saves the edit form. A habit that changes part of the day goes to the end of the new part. */
export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: HabitEdit) => {
      const name = normalizeName(input.name);
      if (!name) throw new Error('A habit needs a name.');
      getDb().transaction((tx) => {
        const current = tx.select().from(habitsHabits).where(eq(habitsHabits.id, input.id)).get();
        if (!current) throw new Error('Habit not found.');
        const last = tx
          .select({ position: max(habitsHabits.position) })
          .from(habitsHabits)
          .get();
        tx.update(habitsHabits)
          .set({
            name,
            emoji: input.emoji,
            timeOfDay: input.timeOfDay,
            color: input.color ?? null,
            ...scheduleColumns(input.schedule),
            ...goalColumns(input.goal),
            quit: input.quit ?? false,
            ...(current.timeOfDay === input.timeOfDay
              ? {}
              : { position: (last?.position ?? -1) + 1 }),
          })
          .where(eq(habitsHabits.id, input.id))
          .run();
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsKeys.all }),
  });
}

/** Optimistic list change shared by reorder, archive, restore and delete; rolls back on error. */
function useOptimisticHabits<V>(
  write: (variables: V) => void,
  apply: (
    variables: V,
    lists: { active: Habit[]; archived: Habit[] },
  ) => { active: Habit[]; archived: Habit[] },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: V) => write(variables),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.all });
      const previous = {
        active: queryClient.getQueryData<Habit[]>(habitsKeys.lists()),
        archived: queryClient.getQueryData<Habit[]>(habitsKeys.archived()),
      };
      const next = apply(variables, {
        active: previous.active ?? [],
        archived: previous.archived ?? [],
      });
      if (previous.active) queryClient.setQueryData(habitsKeys.lists(), next.active);
      if (previous.archived) queryClient.setQueryData(habitsKeys.archived(), next.archived);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(habitsKeys.lists(), context?.previous.active);
      queryClient.setQueryData(habitsKeys.archived(), context?.previous.archived);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsKeys.all }),
  });
}

const byPosition = (a: Habit, b: Habit) => a.position - b.position;

/** Moves a habit up or down within its part of the day and rewrites the positions. */
export function useMoveHabit() {
  return useOptimisticHabits<{ id: string; direction: Direction }>(
    ({ id, direction }) => {
      getDb().transaction((tx) => {
        const active = tx.select().from(habitsHabits).where(isNull(habitsHabits.archivedAt)).all();
        const before = new Map(active.map((habit) => [habit.id, habit.position]));
        for (const habit of moveWithinPart(active, id, direction)) {
          if (habit.position !== before.get(habit.id)) {
            tx.update(habitsHabits)
              .set({ position: habit.position })
              .where(eq(habitsHabits.id, habit.id))
              .run();
          }
        }
      });
    },
    ({ id, direction }, lists) => ({
      ...lists,
      active: moveWithinPart(lists.active, id, direction).sort(byPosition),
    }),
  );
}

/** Archives a habit: it leaves the list, streaks and Today; its completions are kept. */
export function useArchiveHabit() {
  return useOptimisticHabits<string>(
    (id) => {
      getDb()
        .update(habitsHabits)
        .set({ archivedAt: toIsoDate(new Date()) })
        .where(eq(habitsHabits.id, id))
        .run();
    },
    (id, { active, archived }) => {
      const habit = active.find((item) => item.id === id);
      return {
        active: active.filter((item) => item.id !== id),
        archived: habit
          ? [...archived, { ...habit, archivedAt: toIsoDate(new Date()) }].sort(byPosition)
          : archived,
      };
    },
  );
}

/** Restores an archived habit to the end of its part of the day. */
export function useRestoreHabit() {
  return useOptimisticHabits<string>(
    (id) => {
      getDb().transaction((tx) => {
        const last = tx
          .select({ position: max(habitsHabits.position) })
          .from(habitsHabits)
          .get();
        tx.update(habitsHabits)
          .set({ archivedAt: null, position: (last?.position ?? -1) + 1 })
          .where(eq(habitsHabits.id, id))
          .run();
      });
    },
    (id, { active, archived }) => {
      const habit = archived.find((item) => item.id === id);
      return {
        active: habit
          ? [...active, { ...habit, archivedAt: null, position: endPosition(active) }].sort(
              byPosition,
            )
          : active,
        archived: archived.filter((item) => item.id !== id),
      };
    },
  );
}

/** Deletes an archived habit and its completions in one transaction. */
export function useDeleteHabit() {
  return useOptimisticHabits<string>(
    (id) => {
      getDb().transaction((tx) => {
        tx.delete(habitsCompletions).where(eq(habitsCompletions.habitId, id)).run();
        tx.delete(habitsHabits).where(eq(habitsHabits.id, id)).run();
      });
    },
    (id, { active, archived }) => ({
      active,
      archived: archived.filter((item) => item.id !== id),
    }),
  );
}
