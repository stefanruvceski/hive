// Pure Money logic: what an entry means for a space's balance, and how entries are grouped.
// Tested in entries.test.ts.

import { allocate } from './amount';
import type { EntryKind, Space } from '../data/schema';

export type EntryLike = {
  id: string;
  space: Space;
  kind: EntryKind;
  amountRsdMinor: number;
  categoryId: string | null;
  date: string;
  createdAt: string;
};

/**
 * The effect on the space's balance, in RSD minor units. A payout leaves Firma and arrives in
 * Private, so it is a minus in one space and a plus in the other — and never "income".
 */
export function signedRsd(entry: Pick<EntryLike, 'space' | 'kind' | 'amountRsdMinor'>): number {
  if (entry.kind === 'expense') return -entry.amountRsdMinor;
  if (entry.kind === 'income') return entry.amountRsdMinor;
  return entry.space === 'private' ? entry.amountRsdMinor : -entry.amountRsdMinor;
}

export type Totals = { income: number; expense: number; payout: number; balance: number };

/** Earned income, spending, payouts (signed for the space) and the balance over a list. */
export function totalsOf(entries: readonly EntryLike[]): Totals {
  const totals: Totals = { income: 0, expense: 0, payout: 0, balance: 0 };
  for (const entry of entries) {
    if (entry.kind === 'income') totals.income += entry.amountRsdMinor;
    else if (entry.kind === 'expense') totals.expense += entry.amountRsdMinor;
    else totals.payout += signedRsd(entry);
    totals.balance += signedRsd(entry);
  }
  return totals;
}

export type DayGroup<T extends EntryLike> = { date: string; entries: T[]; net: number };

/** Newest day first; inside a day, the last saved first. */
export function groupByDay<T extends EntryLike>(entries: readonly T[]): DayGroup<T>[] {
  const days = new Map<string, T[]>();
  for (const entry of entries) days.set(entry.date, [...(days.get(entry.date) ?? []), entry]);
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, list]) => {
      const sorted = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return { date, entries: sorted, net: sorted.reduce((sum, e) => sum + signedRsd(e), 0) };
    });
}

export type ItemLike = { entryId: string; amountMinor: number; categoryId: string };

/**
 * How much of an expense goes to each category, in RSD. An entry with items splits its RSD value
 * over the items (the parts add up exactly); one without goes whole to its own category.
 */
export function spendingByCategory(
  entries: readonly EntryLike[],
  items: readonly ItemLike[],
): Map<string, number> {
  const itemsOf = new Map<string, ItemLike[]>();
  for (const item of items) itemsOf.set(item.entryId, [...(itemsOf.get(item.entryId) ?? []), item]);
  const spent = new Map<string, number>();
  const add = (categoryId: string, minor: number) =>
    spent.set(categoryId, (spent.get(categoryId) ?? 0) + minor);
  for (const entry of entries) {
    if (entry.kind !== 'expense') continue;
    const parts = itemsOf.get(entry.id);
    if (parts && parts.length > 0) {
      const shares = allocate(
        entry.amountRsdMinor,
        parts.map((part) => part.amountMinor),
      );
      parts.forEach((part, index) => add(part.categoryId, shares[index] ?? 0));
    } else if (entry.categoryId) {
      add(entry.categoryId, entry.amountRsdMinor);
    }
  }
  return spent;
}
