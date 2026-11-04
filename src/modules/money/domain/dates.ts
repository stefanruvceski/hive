// Pure date helpers on `YYYY-MM-DD` / `YYYY-MM` strings; no time zones involved. Tested in dates.test.ts.

const utc = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const addDays = (date: string, days: number): string => {
  const moved = utc(date);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
};

/** Monday = 1 … Sunday = 7. */
export const isoWeekday = (date: string): number => utc(date).getUTCDay() || 7;

export const monthOf = (date: string): string => date.slice(0, 7);

export const daysInMonth = (month: string): number => {
  const [year = 0, mon = 1] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
};

export const shiftMonth = (month: string, delta: number): string => {
  const [year = 0, mon = 1] = month.split('-').map(Number);
  const index = year * 12 + (mon - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
};

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

/** "November 2026". */
export const monthLabel = (month: string): string => {
  const [year, mon = '1'] = month.split('-');
  return `${monthNames[Number(mon) - 1] ?? ''} ${year}`;
};

/** First and last day of a month. */
export const monthBounds = (month: string): { from: string; to: string } => ({
  from: `${month}-01`,
  to: `${month}-${String(daysInMonth(month)).padStart(2, '0')}`,
});

export const isIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && utc(value).toISOString().slice(0, 10) === value;

/** A `YYYY-MM-DD` day as a local date at noon, which no time zone shifts to another day. */
export const isoToDate = (date: string): Date => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
};

/** The local calendar day of a date as `YYYY-MM-DD`. */
export const dateToIso = (date: Date): string =>
  [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
