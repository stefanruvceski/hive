import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, asc, eq, max } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { toIsoDate } from '@/utils/format-date';

import { habitsCompletions, habitsHabits } from './schema';
import { type NewHabit, newHabitId, normalizeName } from '../domain/habits';
import { type Completion, setCompletion } from '../domain/streak';

export type Habit = typeof habitsHabits.$inferSelect;

// Hierarchical key factory — every key for this module comes from here (07 §1).
export const habitsKeys = {
  all: ['habits'] as const,
  lists: () => [...habitsKeys.all, 'list'] as const,
  completions: () => [...habitsKeys.all, 'completions'] as const,
};

/** Every habit, in the order it was added. */
export const habitsListQuery = () =>
  queryOptions({
    queryKey: habitsKeys.lists(),
    queryFn: async (): Promise<Habit[]> =>
      getDb().select().from(habitsHabits).orderBy(asc(habitsHabits.position)).all(),
  });

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
