import type { PricePoint } from './price-book';
import { chartSeries, slug } from './price-chart';

const pt = (shopKey: string, date: string, unitPrice: number): PricePoint => ({
  key: 'K',
  name: 'K',
  shopKey,
  shop: shopKey,
  date,
  unitPrice,
  unit: null,
  receiptId: 'r',
});

describe('price-chart', () => {
  it('draws one line per shop, oldest to newest, inside the box', () => {
    const history = [
      pt('Maxi', '2026-10-10', 14000),
      pt('Idea', '2026-10-05', 12000),
      pt('Maxi', '2026-10-01', 13000),
    ];
    const { series, min, max } = chartSeries(history, 200, 100);
    expect([min, max]).toEqual([12000, 14000]);
    expect(series.map((s) => s.shopKey)).toEqual(['Maxi', 'Idea']);
    const maxi = series[0]?.points ?? [];
    expect(maxi).toHaveLength(2);
    expect(maxi[0]?.x).toBe(0);
    expect(maxi[1]?.x).toBe(200);
    expect(maxi[1]?.y).toBe(0); // the highest price is at the top
    expect(series[1]?.points[0]?.y).toBe(100); // the lowest at the bottom
  });

  it('centres a single day and a flat price', () => {
    const { series } = chartSeries([pt('A', '2026-10-01', 500)], 200, 100);
    expect(series[0]?.points[0]).toEqual({ x: 100, y: 50, price: 500, date: '2026-10-01' });
  });

  it('is empty without history', () => {
    expect(chartSeries([], 200, 100).series).toEqual([]);
  });

  it('makes ids safe for testIDs', () => {
    expect(slug('MLEKO 2.8% 1L')).toBe('mleko-2-8-1l');
  });
});
