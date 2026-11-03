import {
  type Month,
  canShowNext,
  cellState,
  daysInMonth,
  monthDays,
  monthOf,
  monthRange,
  monthTitle,
  shiftMonth,
  weekdayIndex,
} from './month';

describe('daysInMonth', () => {
  it.each([
    [2026, 1, 31],
    [2026, 2, 28],
    [2028, 2, 29],
    [1900, 2, 28],
    [2000, 2, 29],
    [2026, 4, 30],
    [2026, 12, 31],
  ])('%i-%i has %i days', (year, month, days) => {
    expect(daysInMonth({ year, month })).toBe(days);
  });
});

describe('monthDays', () => {
  it('lists every ISO date of the month with the weekday, Monday first', () => {
    const days = monthDays({ year: 2026, month: 11 });
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ date: '2026-11-01', day: 1, weekday: 6 });
    expect(days[1]).toEqual({ date: '2026-11-02', day: 2, weekday: 0 });
    expect(days[29]).toEqual({ date: '2026-11-30', day: 30, weekday: 0 });
  });

  it('includes 29 February in a leap year', () => {
    expect(monthDays({ year: 2028, month: 2 }).at(-1)?.date).toBe('2028-02-29');
  });
});

describe('weekdayIndex', () => {
  it.each([
    ['2026-11-02', 0],
    ['2026-11-08', 6],
    ['2024-02-29', 3],
    ['2027-01-01', 4],
  ])('%s is weekday %i (0 = Monday)', (date, index) => {
    expect(weekdayIndex(date)).toBe(index);
  });
});

describe('monthOf, shiftMonth, monthTitle, monthRange', () => {
  it('reads the month of a date', () => {
    expect(monthOf('2026-11-02')).toEqual({ year: 2026, month: 11 });
  });

  it.each([
    [{ year: 2026, month: 11 }, -1, { year: 2026, month: 10 }],
    [{ year: 2026, month: 1 }, -1, { year: 2025, month: 12 }],
    [{ year: 2026, month: 12 }, 1, { year: 2027, month: 1 }],
    [{ year: 2026, month: 3 }, -14, { year: 2025, month: 1 }],
  ] as [Month, number, Month][])('shifts %j by %i', (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toEqual(expected);
  });

  it('titles a month with its name and year', () => {
    expect(monthTitle({ year: 2026, month: 11 })).toBe('November 2026');
    expect(monthTitle({ year: 2028, month: 2 })).toBe('February 2028');
  });

  it('gives the first and last date of a month', () => {
    expect(monthRange({ year: 2028, month: 2 })).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});

describe('canShowNext', () => {
  it('stops at the month that contains today', () => {
    expect(canShowNext({ year: 2026, month: 10 }, '2026-11-02')).toBe(true);
    expect(canShowNext({ year: 2026, month: 11 }, '2026-11-02')).toBe(false);
    expect(canShowNext({ year: 2027, month: 1 }, '2026-11-02')).toBe(false);
  });

  it('follows the local day, e.g. the first minute of a new month', () => {
    expect(canShowNext({ year: 2026, month: 11 }, '2026-12-01')).toBe(true);
  });
});

describe('cellState', () => {
  const done = new Set(['2026-11-01', '2026-11-05']);

  it('is done, open or future by the day and the done dates', () => {
    expect(cellState('2026-11-01', done, '2026-11-02')).toBe('done');
    expect(cellState('2026-11-02', done, '2026-11-02')).toBe('open');
    expect(cellState('2026-11-03', done, '2026-11-02')).toBe('future');
  });

  it('keeps a future day future even if a row exists for it', () => {
    expect(cellState('2026-11-05', done, '2026-11-02')).toBe('future');
  });
});
