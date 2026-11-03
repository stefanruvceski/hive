// Habits' summary for Home's Today section (#33). Pure: no React, no database.

import type { HomeSummary } from '@/utils/home-summary';

import { countingCompletions } from './goal';
import { groupByTimeOfDay } from './habits';
import { isScheduled, scheduleOf, type ScheduleType } from './schedule';
import type { Completion } from './streak';
import type { TimeOfDay } from '../data/schema';

type DoneCount = { done: number; total: number };

type ScheduledHabit = {
  id: string;
  scheduleType?: ScheduleType | null;
  scheduleDays?: string | null;
  scheduleTimes?: number | null;
  target?: number | null;
};

/** The habits that are due on `today`: a weekday habit only on its days. */
function dueToday<H extends ScheduledHabit>(habits: readonly H[], today: string): H[] {
  return habits.filter((habit) => isScheduled(scheduleOf(habit), today));
}

/**
 * How many of the habits due on `today` (`YYYY-MM-DD`) are done: a measurable habit once its amount
 * reaches the target. Completions of deleted habits don't count.
 */
export function countDoneToday(
  habits: readonly ScheduledHabit[],
  completions: readonly Completion[],
  today: string,
): DoneCount {
  const due = dueToday(habits, today);
  const ids = new Set(due.map((habit) => habit.id));
  const done = new Set(
    countingCompletions(habits, completions)
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
  H extends ScheduledHabit & {
    name: string;
    emoji: string;
    timeOfDay: TimeOfDay;
    position: number;
  },
>(habits: readonly H[], completions: readonly Completion[], today: string): HomeSummary {
  if (habits.length === 0) {
    return {
      kind: 'message',
      headline: 'No habits yet',
      body: 'Tap to add one',
      label: 'no habits yet',
    };
  }
  const due = dueToday(habits, today);
  if (due.length === 0) {
    return {
      kind: 'message',
      headline: 'Nothing today',
      body: 'No habits are scheduled',
      label: 'no habits scheduled today',
    };
  }
  const { done, total } = countDoneToday(habits, completions, today);
  const doneIds = new Set(
    countingCompletions(habits, completions)
      .filter((completion) => completion.date === today)
      .map((completion) => completion.habitId),
  );
  const upNext = groupByTimeOfDay(due)
    .flatMap((group) => group.habits)
    .filter((habit) => !doneIds.has(habit.id))
    .map((habit) => ({ id: habit.id, icon: habit.emoji, name: habit.name }));
  return { kind: 'progress', done, total, label: `${done} of ${total} done today`, upNext };
}
