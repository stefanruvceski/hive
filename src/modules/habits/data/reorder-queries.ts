import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { type Habit, habitsKeys } from './queries';
import { habitsHabits, habitsTodos } from './schema';
import { type Change, withChanges } from '../domain/reorder';
import type { Todo } from '../domain/todos';

const allTodoKeys = [...habitsKeys.all, 'todos'] as const;

/**
 * Saves a drop: the rows whose position or part of the day changed (`applyDrop`), habits and
 * to-dos together in one transaction. Optimistic on the habit list and every to-do list, rolls
 * back if the write fails.
 */
export function useReorder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: Change[]) => {
      getDb().transaction((tx) => {
        for (const { kind, id, position, timeOfDay } of changes) {
          if (kind === 'habit') {
            tx.update(habitsHabits)
              .set({ position, timeOfDay })
              .where(eq(habitsHabits.id, id))
              .run();
          } else {
            tx.update(habitsTodos).set({ position, timeOfDay }).where(eq(habitsTodos.id, id)).run();
          }
        }
      });
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.all });
      const habits = queryClient.getQueryData<Habit[]>(habitsKeys.lists());
      const todos = queryClient.getQueriesData<Todo[]>({ queryKey: allTodoKeys });
      if (habits) {
        queryClient.setQueryData(
          habitsKeys.lists(),
          withChanges(habits, 'habit', changes).sort((a, b) => a.position - b.position),
        );
      }
      queryClient.setQueriesData<Todo[]>({ queryKey: allTodoKeys }, (old) =>
        old ? withChanges(old, 'todo', changes) : old,
      );
      return { habits, todos };
    },
    onError: (_error, _changes, context) => {
      if (context?.habits) queryClient.setQueryData(habitsKeys.lists(), context.habits);
      for (const [key, data] of context?.todos ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsKeys.all }),
  });
}
