import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eq, max, or } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { toIsoDate } from '@/utils/format-date';

import { habitsKeys } from './queries';
import { habitsTodos, type TimeOfDay } from './schema';
import { editTodo, moveTodoTo, removeTodo, setTodoDone, type Todo } from '../domain/todos';

// Under the habits key, so one key-prefix invalidation also reaches them.
const todoKey = (today: string) => [...habitsKeys.all, 'todos', today] as const;
const allTodoKeys = [...habitsKeys.all, 'todos'] as const;

/** Every open to-do (what is overdue shows from it) and everything dated `today`, done or not. */
export const habitsTodosQuery = (today: string) =>
  queryOptions({
    queryKey: todoKey(today),
    queryFn: async (): Promise<Todo[]> =>
      getDb()
        .select()
        .from(habitsTodos)
        .where(or(eq(habitsTodos.done, false), eq(habitsTodos.date, today)))
        .all(),
  });

export function useTodos(today: string) {
  return useQuery(habitsTodosQuery(today));
}

/** Optimistic to-do change on every opened to-do list; rolls back on error. */
function useOptimisticTodos<V>(
  write: (variables: V) => void,
  apply: (variables: V, todos: Todo[]) => Todo[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: V) => write(variables),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: allTodoKeys });
      const previous = queryClient.getQueriesData<Todo[]>({ queryKey: allTodoKeys });
      queryClient.setQueriesData<Todo[]>({ queryKey: allTodoKeys }, (old) =>
        old ? apply(variables, old) : old,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: allTodoKeys }),
  });
}

/** `id` is made before saving (`newHabitId`), so the optimistic row and the stored one match. */
export type NewTodo = { id: string; title: string; date: string; timeOfDay: TimeOfDay };

/** Adds a to-do at the end of its day. Rejects a blank title. */
export function useAddTodo() {
  return useOptimisticTodos<NewTodo>(
    ({ id, title, date, timeOfDay }) => {
      const text = title.trim();
      if (!text) throw new Error('A to-do needs a title.');
      getDb().transaction((tx) => {
        const last = tx
          .select({ position: max(habitsTodos.position) })
          .from(habitsTodos)
          .get();
        tx.insert(habitsTodos)
          .values({
            id,
            title: text,
            date,
            timeOfDay,
            position: (last?.position ?? -1) + 1,
            createdAt: toIsoDate(new Date()),
          })
          .run();
      });
    },
    (variables, todos) => [
      ...todos,
      {
        id: variables.id,
        title: variables.title.trim(),
        date: variables.date,
        timeOfDay: variables.timeOfDay,
        done: false,
        doneAt: null,
        position: todos.reduce((highest, todo) => Math.max(highest, todo.position), -1) + 1,
        createdAt: toIsoDate(new Date()),
      },
    ],
  );
}

export function useToggleTodo() {
  return useOptimisticTodos<{ id: string; done: boolean }>(
    ({ id, done }) => {
      getDb()
        .update(habitsTodos)
        .set({ done, doneAt: done ? new Date().toISOString() : null })
        .where(eq(habitsTodos.id, id))
        .run();
    },
    ({ id, done }, todos) => setTodoDone(todos, id, done, new Date().toISOString()),
  );
}

export function useDeleteTodo() {
  return useOptimisticTodos<string>(
    (id) => {
      getDb().delete(habitsTodos).where(eq(habitsTodos.id, id)).run();
    },
    (id, todos) => removeTodo(todos, id),
  );
}

/** Moves an overdue to-do to another day (today). */
export function useMoveTodo() {
  return useOptimisticTodos<{ id: string; date: string }>(
    ({ id, date }) => {
      getDb().update(habitsTodos).set({ date }).where(eq(habitsTodos.id, id)).run();
    },
    ({ id, date }, todos) => moveTodoTo(todos, id, date),
  );
}

/** Renames a to-do and/or puts it in another part of the day. Rejects a blank title. */
export function useUpdateTodo() {
  return useOptimisticTodos<{ id: string; title: string; timeOfDay: TimeOfDay }>(
    ({ id, title, timeOfDay }) => {
      const text = title.trim();
      if (!text) throw new Error('A to-do needs a title.');
      getDb()
        .update(habitsTodos)
        .set({ title: text, timeOfDay })
        .where(eq(habitsTodos.id, id))
        .run();
    },
    ({ id, title, timeOfDay }, todos) => editTodo(todos, id, { title, timeOfDay }),
  );
}
