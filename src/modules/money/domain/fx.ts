// Pure parsing of the National Bank of Serbia's middle rates, as published by kurs.resenje.org
// (keyless). Tested in fx.test.ts; data/fx-client.ts does the network call.

/** The rates URL for a past day; today and later use the latest list. */
export const nbsUrl = (date: string | null): string =>
  `https://kurs.resenje.org/api/v1/rates/${date ?? 'today'}`;

/** RSD per one unit of `currency` (the middle rate over its parity), or null when not listed. */
export function parseNbsRate(body: unknown, currency: string): number | null {
  const rows = (body as { rates?: unknown } | null)?.rates;
  if (!Array.isArray(rows)) return null;
  const row = rows.find(
    (item): item is { code: string; exchange_middle: number; parity?: number } =>
      typeof item === 'object' && item !== null && (item as { code?: unknown }).code === currency,
  );
  if (!row || typeof row.exchange_middle !== 'number' || row.exchange_middle <= 0) return null;
  const parity = typeof row.parity === 'number' && row.parity > 0 ? row.parity : 1;
  return row.exchange_middle / parity;
}
