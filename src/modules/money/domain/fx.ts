// Pure parsing of the National Bank of Serbia's middle rates, as published by kurs.resenje.org
// (keyless), and of the NBS's own page as a fallback. Tested in fx.test.ts; data/fx-client.ts does
// the network calls.

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

/** Why a rate could not be had: no connection, an HTTP error, an answer we cannot read, or not listed. */
export type RateFailure = 'network' | 'status' | 'shape' | 'unlisted';

export type NbsResult =
  | { rate: number; source: 'resenje' | 'nbs'; failure: null; detail: null }
  | { rate: null; source: null; failure: RateFailure; detail: string | null };

/** What the user is told: the cause, not just "could not get". */
export function failureText(failure: RateFailure, currency: string, detail: string | null): string {
  switch (failure) {
    case 'network':
      return 'no connection to the rate service';
    case 'status':
      return `the rate service answered with an error${detail ? ` (${detail})` : ''}`;
    case 'shape':
      return 'the rate service answered in a format Hive does not know';
    case 'unlisted':
      return `the NBS list has no ${currency} rate for this day`;
  }
}

/** The NBS's own middle-rate list (the page people read), used when the mirror fails. */
export const nbsPageUrl = 'https://www.nbs.rs/kursnaListaModul/srednjiKurs.faces?lang=lat';

const cells = (row: string): string[] =>
  [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
    (m[1] ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

const decimal = (text: string): number | null => {
  const t = text.replace(/\./g, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) && Number(t) > 0 ? Number(t) : null;
};

/**
 * RSD per unit from the NBS page: the row holding the currency code, then "valid for" (the
 * parity), buying, middle and selling rate in that order. Null when the layout is not that.
 */
export function parseNbsPage(html: string, currency: string): number | null {
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const c = cells(row);
    const at = c.indexOf(currency);
    if (at < 0) continue;
    const parity = Number(c[at + 1]);
    const middle = decimal(c[at + 3] ?? '');
    if (Number.isInteger(parity) && parity > 0 && middle !== null) return middle / parity;
  }
  return null;
}
