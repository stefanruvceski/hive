// Pure year-dashboard logic: no React, no database. Tested directly in year.test.ts.
// Dates are local ISO dates (`YYYY-MM-DD`) as stored; calendar maths is UTC, so no DST drift.

import { type Completion, previousDay } from './streak';

export type YearHabit = { id: string; name: string; color?: string | null };

const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const weekdayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

function utc(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function daysInYear(year: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? 366 : 365;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(date: string): number {
  return (utc(date).getUTCDay() + 6) % 7;
}

/** The `index`-th day of a year (0 = 1 January). */
function dayOfYear(year: number, index: number): string {
  return new Date(Date.UTC(year, 0, 1 + index)).toISOString().slice(0, 10);
}

export type YearGrid = {
  /** Mon-first week columns of 7 cells; a cell outside the year is null. */
  weeks: (string | null)[][];
  /** Each month's label and the column its first day is in. */
  months: { label: string; column: number }[];
};

export function buildYearGrid(year: number): YearGrid {
  const offset = weekdayOf(`${year}-01-01`);
  const total = daysInYear(year);
  const columns = Math.ceil((offset + total) / 7);
  const weeks: (string | null)[][] = Array.from({ length: columns }, () =>
    Array<string | null>(7).fill(null),
  );
  const months: YearGrid['months'] = [];
  for (let index = 0; index < total; index += 1) {
    const date = dayOfYear(year, index);
    const cell = offset + index;
    const column = weeks[Math.floor(cell / 7)];
    if (column) column[cell % 7] = date;
    if (date.endsWith('-01')) {
      months.push({ label: monthLabels[months.length] ?? '', column: Math.floor(cell / 7) });
    }
  }
  return { weeks, months };
}

/** Heatmap step 0–4 from how many of the habits were done that day. */
export function heatLevel(done: number, habits: number): number {
  if (done <= 0 || habits <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((4 * done) / habits)));
}

export type YearInsights = {
  total: number;
  activeDays: number;
  /** Habits done per date. */
  perDay: Map<string, number>;
  /** 0 = Monday; the weekday with the highest completion rate. */
  bestWeekday: number | null;
  longestStreak: { name: string; length: number } | null;
  mostCompleted: { name: string; count: number } | null;
};

type Input = {
  year: number;
  habits: readonly YearHabit[];
  completions: readonly Completion[];
  /** Local today: weekdays after it are not counted in the current year. */
  today: string;
};

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export function yearInsights({ year, habits, completions, today }: Input): YearInsights {
  const prefix = `${year}-`;
  const names = new Map(habits.map((habit) => [habit.id, habit.name]));
  const datesByHabit = new Map<string, string[]>();
  const perDay = new Map<string, number>();
  let total = 0;
  for (const { habitId, date } of completions) {
    if (!date.startsWith(prefix) || !names.has(habitId)) continue;
    total += 1;
    perDay.set(date, (perDay.get(date) ?? 0) + 1);
    datesByHabit.set(habitId, [...(datesByHabit.get(habitId) ?? []), date]);
  }

  let longestStreak: YearInsights['longestStreak'] = null;
  let mostCompleted: YearInsights['mostCompleted'] = null;
  const ranked = [...datesByHabit].map(([id, dates]) => ({ name: names.get(id) ?? '', dates }));
  for (const { name, dates } of ranked.sort(byName)) {
    const count = dates.length;
    if (!mostCompleted || count > mostCompleted.count) mostCompleted = { name, count };
    let run = 0;
    let previous = '';
    for (const date of [...dates].sort()) {
      run = previousDay(date) === previous ? run + 1 : 1;
      previous = date;
      if (!longestStreak || run > longestStreak.length) longestStreak = { name, length: run };
    }
  }

  let bestWeekday: number | null = null;
  if (total > 0) {
    const lastDay = today.startsWith(prefix) ? today : `${year}-12-31`;
    const doneOn = Array<number>(7).fill(0);
    const daysOn = Array<number>(7).fill(0);
    for (let index = 0; index < daysInYear(year); index += 1) {
      const date = dayOfYear(year, index);
      if (date > lastDay) break;
      daysOn[weekdayOf(date)] = (daysOn[weekdayOf(date)] ?? 0) + 1;
    }
    for (const [date, count] of perDay) {
      doneOn[weekdayOf(date)] = (doneOn[weekdayOf(date)] ?? 0) + count;
    }
    let best = -1;
    for (let day = 0; day < 7; day += 1) {
      const rate = (doneOn[day] ?? 0) / Math.max(1, daysOn[day] ?? 0);
      if (rate > best) {
        best = rate;
        bestWeekday = day;
      }
    }
  }

  return { total, activeDays: perDay.size, perDay, bestWeekday, longestStreak, mostCompleted };
}

/** The heatmap's accessible label; `habitName` when it shows one habit instead of all. */
export function yearSummary(
  year: number,
  total: number,
  activeDays: number,
  habitName?: string,
): string {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  const subject = habitName ? `, ${habitName}` : '';
  return `Year ${year}${subject}, ${plural(total, 'completion')} on ${plural(activeDays, 'active day')}`;
}

/** The week column a date is in, or null when it isn't in the year's grid. */
export function weekColumn(year: number, date: string): number | null {
  const column = buildYearGrid(year).weeks.findIndex((week) => week.includes(date));
  return column < 0 ? null : column;
}
