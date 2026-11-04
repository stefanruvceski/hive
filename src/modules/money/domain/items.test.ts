import { checkItems } from './items';

const item = (name: string, amountMinor: number) => ({ name, amountMinor, categoryId: 'food' });

describe('checkItems', () => {
  it('accepts items that add up to the total, and no items at all', () => {
    expect(checkItems(1000, [item('Milk', 400), item('Bread', 600)])).toEqual({ ok: true });
    expect(checkItems(1000, [])).toEqual({ ok: false, reason: 'mismatch', diff: 1000 });
  });

  it('says how much is missing or over', () => {
    expect(checkItems(1000, [item('Milk', 400)])).toEqual({
      ok: false,
      reason: 'mismatch',
      diff: 600,
    });
    expect(checkItems(1000, [item('Milk', 1200)])).toEqual({
      ok: false,
      reason: 'mismatch',
      diff: -200,
    });
  });

  it('refuses a blank name and a non-positive amount', () => {
    expect(checkItems(100, [item(' ', 100)])).toMatchObject({ ok: false, reason: 'empty-name' });
    expect(checkItems(100, [item('A', 0), item('B', 100)])).toMatchObject({
      ok: false,
      reason: 'bad-amount',
    });
  });
});
