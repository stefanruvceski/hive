// Pure ordering for the Habits list: no React, no database. Tested in order.test.ts.

import type { TimeOfDay } from '../data/schema';

type Ordered = { id: string; timeOfDay: TimeOfDay; position: number };
export type Direction = 'up' | 'down';

/** The habit next to `id` in its part of the day, by `position`; undefined at the edge. */
function neighbour<H extends Ordered>(habits: readonly H[], id: string, direction: Direction) {
  const habit = habits.find((item) => item.id === id);
  if (!habit) return undefined;
  const part = habits
    .filter((item) => item.timeOfDay === habit.timeOfDay)
    .sort((a, b) => a.position - b.position);
  const next = part[part.indexOf(habit) + (direction === 'up' ? -1 : 1)];
  return next && { habit, next };
}

export function canMove(habits: readonly Ordered[], id: string, direction: Direction): boolean {
  return neighbour(habits, id, direction) !== undefined;
}

/** Swaps `id` with its neighbour in the same part of the day; other habits keep their position. */
export function moveWithinPart<H extends Ordered>(
  habits: readonly H[],
  id: string,
  direction: Direction,
): H[] {
  const pair = neighbour(habits, id, direction);
  if (!pair) return [...habits];
  const { habit, next } = pair;
  return habits.map((item) =>
    item.id === habit.id
      ? { ...item, position: next.position }
      : item.id === next.id
        ? { ...item, position: habit.position }
        : item,
  );
}

/** The position that puts a habit last in its part of the day (and the list). */
export function endPosition(habits: readonly { position: number }[]): number {
  return habits.reduce((end, habit) => Math.max(end, habit.position + 1), 0);
}
