import { latestRates, pickRate, type RateRow } from './rates';

const rows: RateRow[] = [
  { currency: 'EUR', date: '2026-10-01', rate: 117.1, source: 'manual' },
  { currency: 'EUR', date: '2026-11-01', rate: 117.2, source: 'manual' },
  { currency: 'USD', date: '2026-10-15', rate: 108, source: 'nbs' },
];

describe('pickRate', () => {
  it('uses the latest rate on or before the date', () => {
    expect(pickRate(rows, 'EUR', '2026-10-20')).toEqual({
      rate: 117.1,
      date: '2026-10-01',
      source: 'manual',
    });
    expect(pickRate(rows, 'EUR', '2026-11-03')?.rate).toBe(117.2);
  });

  it('has nothing before the first rate, or for an unknown currency', () => {
    expect(pickRate(rows, 'EUR', '2026-09-30')).toBeNull();
    expect(pickRate(rows, 'CHF', '2026-11-03')).toBeNull();
  });

  it('is always 1 for the base currency', () => {
    expect(pickRate([], 'RSD', '2026-11-03')).toEqual({
      rate: 1,
      date: '2026-11-03',
      source: 'base',
    });
  });
});

describe('latestRates', () => {
  it('keeps the newest per currency, sorted by code', () => {
    expect(latestRates(rows).map((r) => [r.currency, r.rate])).toEqual([
      ['EUR', 117.2],
      ['USD', 108],
    ]);
  });
});
