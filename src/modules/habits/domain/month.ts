// Pure month-grid logic: no React, no database. Tested directly in month.test.ts.
// Calendar maths is done in UTC on the date parts, so it never drifts with the time zone or DST;
// "today" always comes from the phone's local date (`toIsoDate`), as in streak.ts.

/** A calendar month; `month` is 1–12. */
export type Month = { year: number; month: number };

/** One column of the grid. `weekday` is 0 for Monday … 6 for Sunday. */
export type MonthDay = { date: string; day: number; weekday: number };

export type CellState = 'done' | 'open' | 'future';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (value: number) => String(value).padStart(2, '0');

const isoDate = ({ year, month }: Month, day: number) => `${year}-${pad(month)}-${pad(day)}`;

/** The month an ISO date (`YYYY-MM-DD`) is in. */
export function monthOf(date: string): Month {
  const [year = 0, month = 1] = date.split('-').map(Number);
  return { year, month };
}

export function daysInMonth({ year, month }: Month): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 for Monday … 6 for Sunday: weeks start on Monday. */
export function weekdayIndex(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/** Every day of the month, in order. */
export function monthDays(month: Month): MonthDay[] {
  return Array.from({ length: daysInMonth(month) }, (_, index) => {
    const date = isoDate(month, index + 1);
    return { date, day: index + 1, weekday: weekdayIndex(date) };
  });
}

/** The month `delta` months from `month` (negative = earlier). */
export function shiftMonth({ year, month }: Month, delta: number): Month {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** "November 2026". */
export function monthTitle({ year, month }: Month): string {
  return `${monthNames[month - 1]} ${year}`;
}

/** First and last date of the month, for the range query. */
export function monthRange(month: Month): { from: string; to: string } {
  return { from: isoDate(month, 1), to: isoDate(month, daysInMonth(month)) };
}

/** The grid can't go past the month that contains `today`. */
export function canShowNext(month: Month, today: string): boolean {
  const current = monthOf(today);
  return month.year * 12 + month.month < current.year * 12 + current.month;
}

/** A cell is done, open (can be marked) or future (can't be touched yet). */
export function cellState(date: string, doneDates: ReadonlySet<string>, today: string): CellState {
  if (date > today) return 'future';
  return doneDates.has(date) ? 'done' : 'open';
}
