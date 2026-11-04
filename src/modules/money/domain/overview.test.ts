import type { EntryLike } from './entries';
import { axisLabel, axisTicks, monthSummary, yearSeries } from './overview';

const entry = (over: Partial<EntryLike> & { id: string }): EntryLike => ({
  space: 'private',
  kind: 'expense',
  amountRsdMinor: 1000,
  categoryId: 'food',
  date: '2026-11-03',
  createdAt: '2026-11-03T10:00:00Z',
  ...over,
});

describe('monthSummary', () => {
  it('ranks categories by spending with their share, and lists the biggest expenses', () => {
    const summary = monthSummary(
      [
        entry({ id: 'a', amountRsdMinor: 3000, categoryId: 'home' }),
        entry({ id: 'b', amountRsdMinor: 1000 }),
        entry({ id: 'c', kind: 'income', amountRsdMinor: 9000, categoryId: 'salary' }),
      ],
      [],
    );

    expect(summary.byCategory).toEqual([
      { categoryId: 'home', spent: 3000, share: 0.75 },
      { categoryId: 'food', spent: 1000, share: 0.25 },
    ]);
    expect(summary.biggest.map((e) => e.id)).toEqual(['a', 'b']);
    expect(summary.totals.balance).toBe(5000);
  });

  it('is empty for no entries', () => {
    expect(monthSummary([], [])).toMatchObject({ byCategory: [], biggest: [] });
  });
});

describe('yearSeries', () => {
  it('has twelve months, with income and spending where they happened', () => {
    const series = yearSeries(
      [
        entry({ id: 'a', date: '2026-02-10', amountRsdMinor: 500 }),
        entry({ id: 'b', date: '2026-02-11', kind: 'income', amountRsdMinor: 2000 }),
        entry({ id: 'c', date: '2025-12-31' }),
      ],
      2026,
    );

    expect(series).toHaveLength(12);
    expect(series[1]).toEqual({ month: '2026-02', income: 2000, expense: 500 });
    expect(series[0]).toEqual({ month: '2026-01', income: 0, expense: 0 });
  });
});

describe('axisTicks', () => {
  it('splits the tallest bar into round steps', () => {
    expect(axisTicks(100_000_000)).toEqual([25_000_000, 50_000_000, 75_000_000, 100_000_000]);
    expect(axisTicks(64_804_474)).toEqual([20_000_000, 40_000_000, 60_000_000, 80_000_000]);
  });

  it('never returns more than four lines and always covers the tallest bar', () => {
    for (const max of [1, 99, 12_345, 7_000_000, 987_654_321]) {
      const ticks = axisTicks(max);
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.length).toBeLessThanOrEqual(4);
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
    }
  });
});

describe('axisLabel', () => {
  it('shortens thousands and millions', () => {
    expect(axisLabel(25_000_000)).toBe('250K');
    expect(axisLabel(150_000_000)).toBe('1.5M');
    expect(axisLabel(50_000)).toBe('500');
  });
});
