// Habits' summary for Home's Today section (#33). Pure: no React, no database.

import type { HomeSummary } from '@/utils/home-summary';

import { groupByTimeOfDay } from './habits';
import type { Completion } from './streak';
import type { TimeOfDay } from '../data/schema';

type DoneCount = { done: number; total: number };

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

/**
 * Habits' Today widget: how many are done today and the ones still to do, by part of the day (then
 * list order), or an invitation to add one when there are no habits yet.
 */
export function habitsHomeSummary<
  H extends { id: string; name: string; emoji: string; timeOfDay: TimeOfDay; position: number },
>(habits: readonly H[], completions: readonly Completion[], today: string): HomeSummary {
  if (habits.length === 0) {
    return {
      kind: 'message',
      headline: 'No habits yet',
      body: 'Tap to add one',
      label: 'no habits yet',
    };
  }
  const { done, total } = countDoneToday(habits, completions, today);
  const doneIds = new Set(
    completions.filter((completion) => completion.date === today).map((c) => c.habitId),
  );
  const upNext = groupByTimeOfDay(habits)
    .flatMap((group) => group.habits)
    .filter((habit) => !doneIds.has(habit.id))
    .map((habit) => ({ id: habit.id, icon: habit.emoji, name: habit.name }));
  return { kind: 'progress', done, total, label: `${done} of ${total} done today`, upNext };
}
