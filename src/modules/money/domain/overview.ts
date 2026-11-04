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
