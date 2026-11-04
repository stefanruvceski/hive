// Pure Money logic: when a recurring rule falls due. Tested in recurring.test.ts.

import { addDays, daysInMonth, isoWeekday, monthOf, shiftMonth } from './dates';
import type { Frequency } from '../data/schema';

export type RuleLike = {
  frequency: Frequency;
  /** Weekday 1–7 (weekly) or day of month 1–31 (monthly). */
  day: number;
  startDate: string;
  endDate: string | null;
};

/** The dates a rule falls on between `from` and `to`, both included. A 31st clamps to month end. */
export function occurrences(rule: RuleLike, from: string, to: string): string[] {
  const first = from > rule.startDate ? from : rule.startDate;
  const last = rule.endDate && rule.endDate < to ? rule.endDate : to;
  if (first > last) return [];
  const dates: string[] = [];
  if (rule.frequency === 'weekly') {
    for (let date = first; date <= last; date = addDays(date, 1)) {
      if (isoWeekday(date) === rule.day) dates.push(date);
    }
    return dates;
  }
  for (let month = monthOf(first); month <= monthOf(last); month = shiftMonth(month, 1)) {
    const day = Math.min(rule.day, daysInMonth(month));
    const date = `${month}-${String(day).padStart(2, '0')}`;
    if (date >= first && date <= last) dates.push(date);
  }
  return dates;
}

/** The occurrences up to `today` that have no entry yet: what to create when the app opens. */
export function missingOccurrences(
  rule: RuleLike,
  existing: ReadonlySet<string>,
  today: string,
): string[] {
  return occurrences(rule, rule.startDate, today).filter((date) => !existing.has(date));
}

const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Weekday 1 (Monday) to 7 (Sunday) as a name. */
export const weekdayName = (day: number): string => weekdayNames[day - 1] ?? '';
