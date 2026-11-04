// Pure Money logic: the month and year overviews. Tested in overview.test.ts.

import { monthOf } from './dates';
import {
  type EntryLike,
  type ItemLike,
  spendingByCategory,
  totalsOf,
  type Totals,
} from './entries';

export type MonthSummary = {
  totals: Totals;
  /** Spending per category, biggest first. */
  byCategory: { categoryId: string; spent: number; share: number }[];
  /** The largest expenses of the month. */
  biggest: EntryLike[];
};

export function monthSummary(
  entries: readonly EntryLike[],
  items: readonly ItemLike[],
  limit = 5,
): MonthSummary {
  const spent = spendingByCategory(entries, items);
  const total = [...spent.values()].reduce((a, b) => a + b, 0);
  const byCategory = [...spent.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      spent: amount,
      share: total > 0 ? amount / total : 0,
    }))
    .sort((a, b) => b.spent - a.spent || a.categoryId.localeCompare(b.categoryId));
  const biggest = entries
    .filter((entry) => entry.kind === 'expense')
    .sort((a, b) => b.amountRsdMinor - a.amountRsdMinor || (a.id < b.id ? -1 : 1))
    .slice(0, limit);
  return { totals: totalsOf(entries), byCategory, biggest };
}

export type MonthBar = { month: string; income: number; expense: number };

/** Income and spending for each of the twelve months of a year. */
export function yearSeries(entries: readonly EntryLike[], year: number): MonthBar[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    const { income, expense } = totalsOf(entries.filter((entry) => monthOf(entry.date) === month));
    return { month, income, expense };
  });
}

/**
 * Horizontal grid lines for a chart whose tallest bar is `maxMinor`: up to four evenly spaced,
 * round values (250K, 500K, …); the last one is the top of the chart.
 */
export function axisTicks(maxMinor: number): number[] {
  const max = Math.max(maxMinor / 100, 1);
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const nice = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10;
  const step = Math.max(1, nice * magnitude);
  return Array.from({ length: Math.ceil(max / step) }, (_, i) => (i + 1) * step * 100);
}

/** A short axis label for an amount in minor units: 250000 → "250K", 1500000 → "1.5M". */
export function axisLabel(minor: number): string {
  const whole = minor / 100;
  const short = (value: number, unit: string) => `${Number(value.toFixed(1))}${unit}`;
  if (whole >= 1_000_000) return short(whole / 1_000_000, 'M');
  if (whole >= 1_000) return short(whole / 1_000, 'K');
  return String(whole);
}
