// Habit schedules and streaks. Pure: no React, no database. Tested in schedule.test.ts.
// Dates are local ISO dates (`YYYY-MM-DD`); calendar maths is UTC on the date parts, so it never
// drifts with the time zone or DST.

import type { ScheduleType } from '../data/schema';

export type { ScheduleType };

/** Every day, chosen weekdays (`days`: 1 = Monday … 7 = Sunday), or `times` a week on any days. */
export type Schedule = { type: ScheduleType; days: readonly number[]; times: number };

export const scheduleTypes: readonly { value: ScheduleType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Days' },
  { value: 'weekly', label: 'Weekly' },
];

export const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** The stored days text ("1,3,5") as sorted, distinct weekdays 1–7; anything else is dropped. */
export function parseDays(text: string | null | undefined): number[] {
  const days = (text ?? '')
    .split(',')
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  return [...new Set(days)].sort((a, b) => a - b);
}

export function formatDays(days: readonly number[]): string {
  return [...new Set(days)].sort((a, b) => a - b).join(',');
}

/** The schedule a habit row stores; no columns means daily. */
export function scheduleOf(habit: {
  scheduleType?: ScheduleType | null;
  scheduleDays?: string | null;
  scheduleTimes?: number | null;
}): Schedule {
  return {
    type: habit.scheduleType ?? 'daily',
    days: parseDays(habit.scheduleDays),
    times: Math.min(7, Math.max(1, habit.scheduleTimes ?? 1)),
  };
}

function utc(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** 1 for Monday … 7 for Sunday. */
export function isoWeekday(date: string): number {
  return ((utc(date).getUTCDay() + 6) % 7) + 1;
}

export function addDays(date: string, days: number): string {
  const moved = utc(date);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/** The Monday of the week a date is in. */
export function weekStart(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

/** Whether a habit is expected on a date; a weekly habit may be done on any day of the week. */
export function isScheduled(schedule: Schedule, date: string): boolean {
  return schedule.type !== 'weekdays' || schedule.days.includes(isoWeekday(date));
}

function doneInWeek(done: ReadonlySet<string>, monday: string): number {
  let count = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    if (done.has(addDays(monday, offset))) count += 1;
  }
  return count;
}

/** How many days of the week `date` is in are done, against the weekly target. */
export function weeklyProgress(
  schedule: Schedule,
  done: ReadonlySet<string>,
  date: string,
): { done: number; times: number } {
  return { done: doneInWeek(done, weekStart(date)), times: schedule.times };
}

/**
 * The current streak: days in a row done for a daily or weekday habit (days off neither count nor
 * break it, a day done on a day off counts), or weeks in a row that reached their target for a
 * weekly habit. An open today, or an open current week, doesn't break it: it counts once done.
 */
export function streakOf(
  schedule: Schedule,
  done: ReadonlySet<string>,
  today: string,
): { value: number; unit: 'day' | 'week' } {
  const earliest = [...done].sort()[0];

  if (schedule.type === 'weekly') {
    if (!earliest) return { value: 0, unit: 'week' };
    let week = weekStart(today);
    let value = doneInWeek(done, week) >= schedule.times ? 1 : 0;
    const first = weekStart(earliest);
    for (week = addDays(week, -7); week >= first; week = addDays(week, -7)) {
      if (doneInWeek(done, week) < schedule.times) break;
      value += 1;
    }
    return { value, unit: 'week' };
  }

  if (!earliest) return { value: 0, unit: 'day' };
  let cursor = today;
  if (isScheduled(schedule, cursor) && !done.has(cursor)) cursor = addDays(cursor, -1);
  let value = 0;
  while (cursor >= earliest) {
    if (done.has(cursor)) value += 1;
    else if (isScheduled(schedule, cursor)) break;
    cursor = addDays(cursor, -1);
  }
  return { value, unit: 'day' };
}

/** A weekday habit needs a day; a weekly one 1–7 times a week. */
export function isValidSchedule(schedule: Schedule): boolean {
  if (schedule.type === 'weekdays') return schedule.days.length > 0;
  if (schedule.type === 'weekly') return schedule.times >= 1 && schedule.times <= 7;
  return true;
}

/** The longest streak ever: the same rules as `streakOf`, over every day or week with data. */
export function longestStreakOf(
  schedule: Schedule,
  done: ReadonlySet<string>,
): { value: number; unit: 'day' | 'week' } {
  const sorted = [...done].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const unit = schedule.type === 'weekly' ? 'week' : 'day';
  if (!first || !last) return { value: 0, unit };

  let best = 0;
  let run = 0;
  if (schedule.type === 'weekly') {
    for (let week = weekStart(first); week <= last; week = addDays(week, 7)) {
      run = doneInWeek(done, week) >= schedule.times ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return { value: best, unit };
  }
  for (let day = first; day <= last; day = addDays(day, 1)) {
    if (done.has(day)) {
      run += 1;
      best = Math.max(best, run);
    } else if (isScheduled(schedule, day)) {
      run = 0;
    }
  }
  return { value: best, unit };
}
