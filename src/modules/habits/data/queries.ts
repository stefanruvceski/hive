import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { asc, max } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { toIsoDate } from '@/utils/format-date';

import { habitsHabits } from './schema';
import { type NewHabit, newHabitId, normalizeName } from '../domain/habits';

export type Habit = typeof habitsHabits.$inferSelect;

// Hierarchical key factory — every key for this module comes from here (07 §1).
export const habitsKeys = {
  all: ['habits'] as const,
  lists: () => [...habitsKeys.all, 'list'] as const,
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
