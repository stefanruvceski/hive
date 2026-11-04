import { budgetStatus, effectiveLimit } from './budgets';

const rows = [
  { categoryId: 'food', fromMonth: '2026-01', limitMinor: 5000000 },
  { categoryId: 'food', fromMonth: '2026-06', limitMinor: 6000000 },
  { categoryId: 'fun', fromMonth: '2026-03', limitMinor: 1000000 },
  { categoryId: 'fun', fromMonth: '2026-09', limitMinor: 0 },
];

describe('effectiveLimit', () => {
  it('uses the latest row that has started, and leaves earlier months alone', () => {
    expect(effectiveLimit(rows, 'food', '2026-05')).toBe(5000000);
    expect(effectiveLimit(rows, 'food', '2026-06')).toBe(6000000);
    expect(effectiveLimit(rows, 'food', '2026-11')).toBe(6000000);
  });

  it('has none before the first row, or after a 0 row', () => {
    expect(effectiveLimit(rows, 'food', '2025-12')).toBeNull();
    expect(effectiveLimit(rows, 'fun', '2026-08')).toBe(1000000);
    expect(effectiveLimit(rows, 'fun', '2026-09')).toBeNull();
    expect(effectiveLimit(rows, 'other', '2026-11')).toBeNull();
  });
});

describe('budgetStatus', () => {
  it('warns from 80% and is over once the limit is reached', () => {
    expect(budgetStatus(7999, 10000).state).toBe('ok');
    expect(budgetStatus(8000, 10000).state).toBe('warn');
    expect(budgetStatus(9999, 10000).state).toBe('warn');
    expect(budgetStatus(10000, 10000).state).toBe('over');
    expect(budgetStatus(15000, 10000).ratio).toBe(1.5);
  });
});
