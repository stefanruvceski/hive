// Pure Money logic: which exchange rate applies. Tested in rates.test.ts.
//
// ⚠️ NBS (#73): no keyless, documented NBS JSON API was found, and a third-party one needs an API
// key that must never ship in the client. V1 therefore stores rates typed by hand; a provider that
// fetches them can later fill the same `RateRow`s (source 'nbs') without any other change.

import { baseCurrency } from './amount';

export type RateRow = { currency: string; date: string; rate: number; source: 'nbs' | 'manual' };

/** The rate to suggest for a currency on a date: the latest one on or before it. Base currency is 1. */
export function pickRate(
  rows: readonly RateRow[],
  currency: string,
  date: string,
): { rate: number; date: string; source: RateRow['source'] | 'base' } | null {
  if (currency === baseCurrency) return { rate: 1, date, source: 'base' };
  let best: RateRow | undefined;
  for (const row of rows) {
    if (row.currency !== currency || row.date > date) continue;
    if (!best || row.date > best.date) best = row;
  }
  return best ? { rate: best.rate, date: best.date, source: best.source } : null;
}

/** The most recent rate of each currency, for the Rates screen. */
export function latestRates(rows: readonly RateRow[]): RateRow[] {
  const latest = new Map<string, RateRow>();
  for (const row of rows) {
    const seen = latest.get(row.currency);
    if (!seen || row.date > seen.date) latest.set(row.currency, row);
  }
  return [...latest.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
