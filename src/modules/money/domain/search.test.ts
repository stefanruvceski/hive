import { emptyFilter, filterEntries, isFiltering, toCsv, type SearchEntry } from './search';

const entry = (over: Partial<SearchEntry> & { id: string }): SearchEntry => ({
  space: 'private',
  businessId: null,
  kind: 'expense',
  amountMinor: 1000,
  currency: 'RSD',
  rate: 1,
  amountRsdMinor: 1000,
  categoryId: 'food',
  date: '2026-11-03',
  note: '',
  createdAt: '2026-11-03T10:00:00Z',
  ...over,
});
const names = new Map([
  ['food', 'Food'],
  ['fuel', 'Fuel'],
]);

describe('filterEntries', () => {
  const entries = [
    entry({ id: 'a', note: 'Bread at Maxi' }),
    entry({ id: 'b', categoryId: 'fuel', date: '2026-10-01', kind: 'income' }),
    entry({ id: 'c', categoryId: null, note: 'Split receipt' }),
  ];
  const items = [{ entryId: 'c', name: 'Diesel', amountMinor: 1000, categoryId: 'fuel' }];

  it('matches the note, the category name and item names, ignoring case', () => {
    const find = (query: string) =>
      filterEntries(entries, items, names, { ...emptyFilter, query }).map((e) => e.id);

    expect(find('bread')).toEqual(['a']);
    expect(find('FUEL')).toEqual(['b', 'c']);
    expect(find('diesel')).toEqual(['c']);
    expect(find('nothing')).toEqual([]);
  });

  it('filters by category (items count), kind and period together', () => {
    const run = (patch: object) =>
      filterEntries(entries, items, names, { ...emptyFilter, ...patch }).map((e) => e.id);

    expect(run({ categoryId: 'fuel' })).toEqual(['b', 'c']);
    expect(run({ kind: 'income' })).toEqual(['b']);
    expect(run({ from: '2026-11-01', to: '2026-11-30' })).toEqual(['a', 'c']);
    expect(run({ categoryId: 'fuel', from: '2026-11-01' })).toEqual(['c']);
  });

  it('knows whether anything is filtering', () => {
    expect(isFiltering(emptyFilter)).toBe(false);
    expect(isFiltering({ ...emptyFilter, query: ' x ' })).toBe(true);
    expect(isFiltering({ ...emptyFilter, query: '  ' })).toBe(false);
  });
});

describe('toCsv', () => {
  it('writes a header, one row per entry and quotes what needs it', () => {
    const csv = toCsv(
      [
        entry({
          id: 'a',
          note: 'Bread, "fresh"',
          currency: 'EUR',
          rate: 117.2,
          amountMinor: 500,
          amountRsdMinor: 58600,
        }),
      ],
      [],
      names,
    );
    const lines = csv.replace('﻿', '').trim().split('\r\n');

    expect(lines[0]).toBe('date,owner,kind,category,item,amount,currency,rate,amount_rsd,note');
    expect(lines[1]).toBe(
      '2026-11-03,Private,expense,Food,,5.00,EUR,117.2,586.00,"Bread, ""fresh"""',
    );
    expect(csv.startsWith('﻿')).toBe(true);
  });

  it('names the business of a business entry', () => {
    const csv = toCsv(
      [entry({ id: 'f', space: 'business', businessId: 'b1' })],
      [],
      names,
      new Map([['b1', 'Shop']]),
    );
    expect(csv.trim().split('\r\n')[1]).toContain(',Shop,expense,');
  });

  it('writes one row per item for a split entry, the RSD parts adding up', () => {
    const items = [
      { entryId: 'c', name: 'Diesel', amountMinor: 1, categoryId: 'fuel' },
      { entryId: 'c', name: 'Water', amountMinor: 2, categoryId: 'food' },
    ];
    const csv = toCsv(
      [entry({ id: 'c', categoryId: null, amountMinor: 3, amountRsdMinor: 100 })],
      items,
      names,
    );
    const rows = csv.trim().split('\r\n').slice(1);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain(',Fuel,Diesel,');
    const rsd = rows.map((row) => Number(row.split(',')[8]));
    expect(rsd[0]! + rsd[1]!).toBeCloseTo(1, 5);
  });
});
