// To-dos for a day, shown with the habits. Pure: no React, no database. Tested in todos.test.ts.

import type { TimeOfDay } from '../data/schema';

export type Todo = {
  id: string;
  title: string;
  /** The local ISO date (`YYYY-MM-DD`) the to-do is for. */
  date: string;
  /** The part of the day it sits in on the list. */
  timeOfDay: TimeOfDay;
  done: boolean;
  /** ISO timestamp it was done at. */
  doneAt: string | null;
  position: number;
  createdAt: string;
};

const byOrder = (a: Todo, b: Todo) => a.position - b.position;

/** The to-dos of a day, in their own order. */
export function todosFor(todos: readonly Todo[], date: string): Todo[] {
  return todos.filter((todo) => todo.date === date).sort(byOrder);
}

/** Open to-dos from before `today`, oldest day first. */
export function overdue(todos: readonly Todo[], today: string): Todo[] {
  return todos
    .filter((todo) => !todo.done && todo.date < today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position);
}

/** The to-dos by part of the day, each in the order given; parts without any are left out. */
export function todosByTimeOfDay(todos: readonly Todo[]): Map<TimeOfDay, Todo[]> {
  const grouped = new Map<TimeOfDay, Todo[]>();
  for (const todo of todos)
    grouped.set(todo.timeOfDay, [...(grouped.get(todo.timeOfDay) ?? []), todo]);
  return grouped;
}

/** How many of a day's to-dos are done: counted with the habits in "did I close the day". */
export function todoCounts(todos: readonly Todo[], date: string): { done: number; total: number } {
  const day = todos.filter((todo) => todo.date === date);
  return { done: day.filter((todo) => todo.done).length, total: day.length };
}

const change = (todos: readonly Todo[], id: string, update: Partial<Todo>): Todo[] =>
  todos.map((todo) => (todo.id === id ? { ...todo, ...update } : todo));

// The optimistic cache updates.
export const setTodoDone = (todos: readonly Todo[], id: string, done: boolean, now: string) =>
  change(todos, id, { done, doneAt: done ? now : null });
export const editTodo = (
  todos: readonly Todo[],
  id: string,
  edit: { title: string; timeOfDay: TimeOfDay },
) => change(todos, id, { title: edit.title.trim(), timeOfDay: edit.timeOfDay });
export const moveTodoTo = (todos: readonly Todo[], id: string, date: string) =>
  change(todos, id, { date });
export const removeTodo = (todos: readonly Todo[], id: string) =>
  todos.filter((todo) => todo.id !== id);
