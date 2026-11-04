import {
  byMonth,
  formatAmount,
  formatLiters,
  fuel,
  searchReceipts,
  sortReceipts,
  titleOf,
  totalOf,
  type StatsReceipt,
} from './receipt-stats';

const receipt = (over: Partial<StatsReceipt> = {}): StatsReceipt => ({
  status: 'ok',
  addedAt: Date.UTC(2026, 9, 25, 10),
  time: null,
  total: 1000,
  shop: null,
  company: null,
  address: null,
  city: null,
  note: '',
  invoiceNumber: null,
  items: [],
  ...over,
});

describe('receipt stats', () => {
  it('sums the fuel on a receipt (ported from FiscalParseTest.fuelSummary)', () => {
    const f = fuel(
      receipt({
        items: [
          { name: 'EVRO DIZEL', quantity: 40, unitPrice: 20500, total: 820000 },
          { name: 'Voda Rosa 1,5l', quantity: 2, unitPrice: 8999, total: 17998 },
        ],
      }),
    );
    expect(f).toEqual({ liters: 40, pricePerLiter: 20500, amount: 820000, name: 'EVRO DIZEL' });
    expect(fuel(receipt())).toBeNull();
  });

  it('puts the newest first and pending receipts by scan time', () => {
    const a = receipt({ time: '2026-10-01T10:00:00' });
    const b = receipt({ time: '2026-10-20T10:00:00' });
    const pending = receipt({ status: 'pending', total: null });
    expect(sortReceipts([a, pending, b])).toEqual([pending, b, a]);
  });

  it('groups by month, newest month first', () => {
    const groups = byMonth([
      receipt({ time: '2026-09-30T10:00:00' }),
      receipt({ time: '2026-10-02T10:00:00' }),
      receipt({ time: '2026-10-20T10:00:00' }),
    ]);
    expect(groups.map((g) => [g.month, g.receipts.length])).toEqual([
      ['2026-10', 2],
      ['2026-09', 1],
    ]);
  });

  it('counts only read receipts and lets a refund subtract', () => {
    expect(
      totalOf([
        receipt({ total: 5000 }),
        receipt({ total: -1500 }),
        receipt({ status: 'pending', total: 99 }),
      ]),
    ).toBe(3500);
  });

  it('searches in Latin whatever script is typed', () => {
    const rs = [
      receipt({
        shop: 'Mlekara Šabac',
        items: [{ name: 'Mleko', quantity: 1, unitPrice: 1, total: 1 }],
      }),
      receipt({ shop: 'Maxi', note: 'Ljubljana trip' }),
    ];
    expect(searchReceipts(rs, 'шабац')).toEqual([rs[0]]);
    expect(searchReceipts(rs, 'Љубљана')).toEqual([rs[1]]);
    expect(searchReceipts(rs, 'mleko')).toEqual([rs[0]]);
    expect(searchReceipts(rs, '  ')).toEqual(rs);
  });

  it('formats money with Serbian grouping', () => {
    expect(formatAmount(837998)).toBe('8.379,98');
    expect(formatAmount(-17998)).toBe('-179,98');
    expect(formatAmount(5)).toBe('0,05');
    expect(formatLiters(40)).toBe('40,00 L');
  });

  it('names a receipt by its shop, then its company', () => {
    expect(titleOf({ shop: 'BS Beograd 5', company: 'NIS' })).toBe('BS Beograd 5');
    expect(titleOf({ shop: null, company: 'NIS' })).toBe('NIS');
    expect(titleOf({ shop: null, company: null })).toBe('Receipt');
  });
});
