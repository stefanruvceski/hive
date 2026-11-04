// Pure Money logic: searching, filtering and CSV export of entries. Tested in search.test.ts.

import { minorToText } from './amount';
import type { EntryLike } from './entries';
import type { EntryKind } from '../data/schema';

export type SearchEntry = EntryLike & {
  kind: EntryKind;
  amountMinor: number;
  currency: string;
  rate: number;
  note: string;
};
export type SearchItem = { entryId: string; name: string; amountMinor: number; categoryId: string };

export type Filter = {
  query: string;
  categoryId: string | null;
  kind: EntryKind | null;
  /** Inclusive `YYYY-MM-DD` bounds. */
  from: string | null;
  to: string | null;
};

export const emptyFilter: Filter = {
  query: '',
  categoryId: null,
  kind: null,
  from: null,
  to: null,
};

export const isFiltering = (filter: Filter): boolean =>
  filter.query.trim() !== '' ||
  filter.categoryId !== null ||
  filter.kind !== null ||
  filter.from !== null ||
  filter.to !== null;

/** Entries that match every part of the filter. The query looks in the note, category and item names. */
export function filterEntries<T extends SearchEntry>(
  entries: readonly T[],
  items: readonly SearchItem[],
  categoryNames: ReadonlyMap<string, string>,
  filter: Filter,
): T[] {
  const needle = filter.query.trim().toLowerCase();
  const itemsOf = new Map<string, SearchItem[]>();
  for (const item of items) itemsOf.set(item.entryId, [...(itemsOf.get(item.entryId) ?? []), item]);
  return entries.filter((entry) => {
    const parts = itemsOf.get(entry.id) ?? [];
    if (filter.kind && entry.kind !== filter.kind) return false;
    if (filter.from && entry.date < filter.from) return false;
    if (filter.to && entry.date > filter.to) return false;
    if (
      filter.categoryId &&
      entry.categoryId !== filter.categoryId &&
      !parts.some((part) => part.categoryId === filter.categoryId)
    ) {
      return false;
    }
    if (!needle) return true;
    const haystack = [
      entry.note,
      entry.categoryId ? (categoryNames.get(entry.categoryId) ?? '') : '',
      ...parts.flatMap((part) => [part.name, categoryNames.get(part.categoryId) ?? '']),
    ];
    return haystack.some((text) => text.toLowerCase().includes(needle));
  });
}

const quote = (cell: string) => (/[",\r\n;]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);

export const csvHeader = [
  'date',
  'space',
  'kind',
  'category',
  'item',
  'amount',
  'currency',
  'rate',
  'amount_rsd',
  'note',
] as const;

/**
 * One row per entry, or per item for a split entry (the RSD value is shared out in proportion).
 * UTF-8 with a byte-order mark so spreadsheets open it correctly.
 */
export function toCsv(
  entries: readonly SearchEntry[],
  items: readonly SearchItem[],
  categoryNames: ReadonlyMap<string, string>,
): string {
  const itemsOf = new Map<string, SearchItem[]>();
  for (const item of items) itemsOf.set(item.entryId, [...(itemsOf.get(item.entryId) ?? []), item]);
  const rows: string[][] = [[...csvHeader]];
  for (const entry of entries) {
    const base = (category: string, item: string, amountMinor: number, rsdMinor: number) => [
      entry.date,
      entry.space,
      entry.kind,
      category,
      item,
      minorToText(amountMinor),
      entry.currency,
      String(entry.rate),
      minorToText(rsdMinor),
      entry.note,
    ];
    const parts = itemsOf.get(entry.id) ?? [];
    if (parts.length === 0) {
      const category = entry.categoryId ? (categoryNames.get(entry.categoryId) ?? '') : '';
      rows.push(base(category, '', entry.amountMinor, entry.amountRsdMinor));
      continue;
    }
    const sum = parts.reduce((acc, part) => acc + part.amountMinor, 0);
    let rsdLeft = entry.amountRsdMinor;
    parts.forEach((part, index) => {
      const last = index === parts.length - 1;
      const rsd = last ? rsdLeft : Math.round((entry.amountRsdMinor * part.amountMinor) / sum);
      rsdLeft -= rsd;
      rows.push(base(categoryNames.get(part.categoryId) ?? '', part.name, part.amountMinor, rsd));
    });
  }
  return `﻿${rows.map((row) => row.map(quote).join(',')).join('\r\n')}\r\n`;
}
