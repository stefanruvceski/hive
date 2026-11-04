import type { PricePoint } from './price-book';

// Layout of the price-over-time chart (pure, tested in price-chart.test.ts): one line per shop,
// x by date (oldest left), y by price (highest at the top).

export type ChartPoint = { x: number; y: number; price: number; date: string };
export type ChartSeries = { shopKey: string; shop: string; points: ChartPoint[] };

const DAY = 24 * 60 * 60 * 1000;
const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY);

export function chartSeries(
  history: readonly PricePoint[],
  width: number,
  height: number,
): { series: ChartSeries[]; min: number; max: number } {
  if (history.length === 0) return { series: [], min: 0, max: 0 };
  const prices = history.map((p) => p.unitPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const days = history.map((p) => dayNumber(p.date));
  const first = Math.min(...days);
  const span = Math.max(...days) - first;
  const x = (date: string) => (span === 0 ? width / 2 : ((dayNumber(date) - first) / span) * width);
  const y = (price: number) => (max === min ? height / 2 : ((max - price) / (max - min)) * height);

  const byShop = new Map<string, { shop: string; points: PricePoint[] }>();
  for (const p of history) {
    const entry = byShop.get(p.shopKey) ?? { shop: p.shop, points: [] };
    entry.points.push(p);
    byShop.set(p.shopKey, entry);
  }
  const series = [...byShop.entries()].map(([shopKey, { shop, points }]) => ({
    shopKey,
    shop,
    points: [...points]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ x: x(p.date), y: y(p.unitPrice), price: p.unitPrice, date: p.date })),
  }));
  return { series, min, max };
}

/** A key as a test id part: lower-case letters and digits joined by dashes. */
export const slug = (key: string) =>
  key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
