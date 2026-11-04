import type { EntryLike } from './entries';
import { moneyHomeSummary } from './home-summary';
import type { Owned } from './owners';

const entry = (id: string, over: Partial<EntryLike & Owned> = {}): EntryLike & Owned => ({
  id,
  space: 'private',
  businessId: null,
  kind: 'expense',
  amountRsdMinor: 100000,
  categoryId: 'food',
  date: '2026-11-03',
  createdAt: '2026-11-03T10:00:00Z',
  ...over,
});

const categories = [
  { id: 'food', space: 'private' as const, kind: 'expense' },
  { id: 'fuel', space: 'business' as const, kind: 'expense' },
];
const summarize = (
  entries: (EntryLike & Owned)[],
  view: string,
  budgets: { categoryId: string; fromMonth: string; limitMinor: number }[] = [],
) =>
  moneyHomeSummary(
    entries,
    [],
    categories,
    budgets,
    [{ id: 'f1', name: 'Shop' }],
    view,
    '2026-11-04',
  );

describe('moneyHomeSummary', () => {
  it("shows this month's balance and what was spent", () => {
    const summary = summarize(
      [entry('a'), entry('b', { kind: 'income', amountRsdMinor: 500000 })],
      'private',
    );

    expect(summary).toMatchObject({
      kind: 'message',
      caption: 'Private',
      headline: '4,000',
      body: '1,000 spent',
      footnote: 'RSD',
    });
  });

  it('counts only the open view and only this month', () => {
    const entries = [
      entry('a'),
      entry('b', { space: 'business', businessId: 'f1', amountRsdMinor: 200000 }),
      entry('c', { date: '2026-10-30' }),
    ];

    expect(summarize(entries, 'f1')).toMatchObject({
      body: '2,000 spent',
      caption: 'Shop',
    });
    expect(summarize(entries, 'all')).toMatchObject({
      body: '3,000 spent',
      caption: 'All',
    });
  });

  it('shows a minus for a negative balance', () => {
    expect(summarize([entry('a')], 'private')).toMatchObject({
      headline: '−1,000',
    });
  });

  it('asks for an entry when the month is empty', () => {
    expect(summarize([entry('c', { date: '2026-10-30' })], 'all')).toMatchObject({
      headline: 'Nothing this month',
    });
  });

  it('rings the share of income spent when there are no budgets', () => {
    const summary = summarize(
      [entry('a'), entry('b', { kind: 'income', amountRsdMinor: 400000 })],
      'private',
    );
    expect(summary).toMatchObject({ ring: { share: 0.25, text: '25%' } });
  });

  it("rings the share of the month's budgets used, over income", () => {
    const summary = summarize(
      [entry('a'), entry('b', { kind: 'income', amountRsdMinor: 400000 })],
      'private',
      [{ categoryId: 'food', fromMonth: '2026-01', limitMinor: 200000 }],
    );
    expect(summary).toMatchObject({ ring: { share: 0.5, text: '50%' } });
  });

  it('has no ring with neither income nor budgets', () => {
    expect(summarize([entry('a')], 'private')).not.toHaveProperty('ring', expect.anything());
  });
});
