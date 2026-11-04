import { groupByDay, signedRsd, spendingByCategory, totalsOf, type EntryLike } from './entries';

const entry = (over: Partial<EntryLike> & { id: string }): EntryLike => ({
  space: 'private',
  kind: 'expense',
  amountRsdMinor: 1000,
  categoryId: 'food',
  date: '2026-11-03',
  createdAt: '2026-11-03T10:00:00Z',
  ...over,
});

describe('signedRsd', () => {
  it('is minus for spending and plus for income', () => {
    expect(signedRsd(entry({ id: 'a' }))).toBe(-1000);
    expect(signedRsd(entry({ id: 'a', kind: 'income' }))).toBe(1000);
  });

  it('moves a payout out of Business and into Private', () => {
    expect(signedRsd(entry({ id: 'a', kind: 'payout', space: 'business' }))).toBe(-1000);
    expect(signedRsd(entry({ id: 'a', kind: 'payout', space: 'private' }))).toBe(1000);
  });
});

describe('totalsOf', () => {
  it('keeps payouts out of earned income', () => {
    const totals = totalsOf([
      entry({ id: 'a', kind: 'income', amountRsdMinor: 5000 }),
      entry({ id: 'b', amountRsdMinor: 1200 }),
      entry({ id: 'c', kind: 'payout', amountRsdMinor: 3000 }),
    ]);

    expect(totals).toEqual({ income: 5000, expense: 1200, payout: 3000, balance: 6800 });
  });

  it('is all zero for nothing', () => {
    expect(totalsOf([])).toEqual({ income: 0, expense: 0, payout: 0, balance: 0 });
  });
});

describe('groupByDay', () => {
  it('puts the newest day first, and the last saved first within a day', () => {
    const groups = groupByDay([
      entry({ id: 'old', date: '2026-11-01' }),
      entry({ id: 'first', createdAt: '2026-11-03T09:00:00Z' }),
      entry({
        id: 'last',
        createdAt: '2026-11-03T12:00:00Z',
        kind: 'income',
        amountRsdMinor: 4000,
      }),
    ]);

    expect(groups.map((g) => g.date)).toEqual(['2026-11-03', '2026-11-01']);
    expect(groups[0]?.entries.map((e) => e.id)).toEqual(['last', 'first']);
    expect(groups[0]?.net).toBe(3000);
  });
});

describe('spendingByCategory', () => {
  it('counts an entry without items in its category and ignores income', () => {
    const spent = spendingByCategory(
      [entry({ id: 'a' }), entry({ id: 'b', kind: 'income', categoryId: 'salary' })],
      [],
    );

    expect([...spent]).toEqual([['food', 1000]]);
  });

  it('splits an entry with items over their categories, adding up exactly', () => {
    const spent = spendingByCategory(
      [entry({ id: 'a', amountRsdMinor: 1000, categoryId: null })],
      [
        { entryId: 'a', amountMinor: 1, categoryId: 'food' },
        { entryId: 'a', amountMinor: 1, categoryId: 'home' },
        { entryId: 'a', amountMinor: 1, categoryId: 'fun' },
      ],
    );

    expect([...spent.values()].reduce((a, b) => a + b, 0)).toBe(1000);
    expect(spent.get('food')).toBe(334);
  });
});
