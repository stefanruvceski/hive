// Habits' summary for Home's Today section (#33). Pure: no React, no database.

import type { HomeSummary } from '@/utils/home-summary';

import type { Completion } from './streak';

export type DoneCount = { done: number; total: number };

/** How many of the habits are done on `today` (`YYYY-MM-DD`). Completions of deleted habits don't count. */
export function countDoneToday(
  habits: readonly { id: string }[],
  completions: readonly Completion[],
  today: string,
): DoneCount {
  const ids = new Set(habits.map((habit) => habit.id));
  const done = new Set(
    completions
      .filter((completion) => completion.date === today && ids.has(completion.habitId))
      .map((completion) => completion.habitId),
  );
  return { done: done.size, total: ids.size };
}

/** "1 of 2 done today", or an invitation to add one when there are no habits yet. */
export function habitsHomeSummary({ done, total }: DoneCount): HomeSummary {
  if (total === 0) {
    return {
      kind: 'message',
      headline: 'No habits yet',
      body: 'Tap to add one',
      label: 'no habits yet',
    };
  }
  return {
    kind: 'progress',
    done,
    total,
    caption: 'done today',
    label: `${done} of ${total} done today`,
  };
}
