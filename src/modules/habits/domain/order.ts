// Pure ordering for the Habits list: no React, no database. Tested in order.test.ts.
// Dragging rows is in reorder.ts.

/** The position that puts a habit last in its part of the day (and the list). */
export function endPosition(habits: readonly { position: number }[]): number {
  return habits.reduce((end, habit) => Math.max(end, habit.position + 1), 0);
}
