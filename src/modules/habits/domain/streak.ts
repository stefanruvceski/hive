// Pure streak logic: no React, no database. Tested directly in streak.test.ts.
// Behaviour follows hive-poc HabitStats.currentStreak; every habit is daily until schedules (#9).

/** A habit done on a local date (`YYYY-MM-DD`): one `habits_completions` row. */
export type Completion = { habitId: string; date: string };

/** The day before an ISO date, by calendar (UTC maths): no DST or time-zone drift. */
export function previousDay(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/** Days in a row done, ending today; an open today counts from yesterday (it isn't over yet). */
export function currentStreak(doneDates: ReadonlySet<string>, today: string): number {
  let cursor = doneDates.has(today) ? today : previousDay(today);
  let streak = 0;
  while (doneDates.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

/** Each habit's done dates, for streaks and "done today". */
export function doneDatesByHabit(completions: readonly Completion[]): Map<string, Set<string>> {
  const byHabit = new Map<string, Set<string>>();
  for (const { habitId, date } of completions) {
    const dates = byHabit.get(habitId) ?? new Set<string>();
    dates.add(date);
    byHabit.set(habitId, dates);
  }
  return byHabit;
}

/** The completions after marking a day done or not done (the optimistic cache update). */
export function setCompletion(
  completions: readonly Completion[],
  { habitId, date, done }: Completion & { done: boolean },
): Completion[] {
  const others = completions.filter((row) => row.habitId !== habitId || row.date !== date);
  return done ? [...others, { habitId, date }] : others;
}
