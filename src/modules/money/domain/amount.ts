// Pure money arithmetic: amounts are integer minor units (para/cents), never floats. Tested in amount.test.ts.

/** Currencies offered in V1 (all with two decimals). RSD is the base. */
export const currencies = ['RSD', 'EUR', 'USD', 'CHF', 'GBP'] as const;
export type Currency = (typeof currencies)[number];
export const baseCurrency: Currency = 'RSD';

/** Largest amount accepted, in minor units: keeps arithmetic far inside safe integers. */
export const maxMinor = 99_999_999_999;

/** "12", "12.5", "12,50" → minor units; null for anything else, zero and too large included. */
export function parseAmount(text: string): number | null {
  const match = /^(\d{1,12})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return minor > 0 && minor <= maxMinor ? minor : null;
}

/** Whole units with thousands separators and no currency: 123450 → "1,235"; a minus sign for negative. */
export function formatWhole(minor: number): string {
  const whole = String(Math.round(Math.abs(minor) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${minor < 0 && whole !== '0' ? '−' : ''}${whole}`;
}

/** "1,234.50 EUR"; dinars are shown whole ("1,235 RSD"); a minus sign for negative. */
export function formatMinor(minor: number, currency: string = baseCurrency): string {
  if (currency === baseCurrency) return `${formatWhole(minor)} ${currency}`;
  const sign = minor < 0 ? '−' : '';
  const abs = Math.abs(minor);
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${whole}.${String(abs % 100).padStart(2, '0')} ${currency}`;
}

/**
 * An entry's own amount: like `formatMinor`, but dinars keep their para when there are any
 * ("3,000.61 RSD"), so a receipt's 3.000,61 is not shown as 3,001. Totals stay whole.
 */
export function formatExact(minor: number, currency: string = baseCurrency): string {
  if (currency !== baseCurrency || minor % 100 === 0) return formatMinor(minor, currency);
  const sign = minor < 0 ? '−' : '';
  const abs = Math.abs(minor);
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${whole}.${String(abs % 100).padStart(2, '0')} ${currency}`;
}

/** Minor units as the text a field shows: 1250 → "12.50". */
export const minorToText = (minor: number): string => (minor / 100).toFixed(2);

/** A positive rate with up to six decimals ("117,2" or "117.2"); null otherwise. */
export function parseRate(text: string): number | null {
  const match = /^(\d{1,6})(?:[.,](\d{1,6}))?$/.exec(text.trim());
  if (!match) return null;
  const rate = Number(`${match[1]}.${match[2] ?? '0'}`);
  return rate > 0 ? rate : null;
}

/** The RSD value of an amount at a rate (RSD per unit), rounded to the nearest para. */
export const toRsdMinor = (amountMinor: number, rate: number): number =>
  Math.round(amountMinor * rate);

/** Splits `total` over weights so the parts add up to exactly `total` (largest remainder). */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const shares = weights.map((weight) => (total * weight) / sum);
  const parts = shares.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = shares
    .map((share, index) => ({ index, rest: share - Math.floor(share) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    left -= 1;
  }
  return parts;
}
