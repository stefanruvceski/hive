// The only place in Money that calls the network: the NBS middle rate for a currency and day.
import { ApiError, publicJson, publicText } from '@/lib/api';

import {
  type NbsResult,
  nbsPageUrl,
  nbsUrl,
  parseNbsPage,
  parseNbsRate,
  type RateFailure,
} from '../domain/fx';

type Attempt = { rate: number } | { failure: RateFailure; detail: string | null };

const failed = (error: unknown): Attempt =>
  error instanceof ApiError
    ? { failure: 'status', detail: `HTTP ${error.status}` }
    : { failure: 'network', detail: error instanceof Error ? error.message : null };

/** The mirror (kurs.resenje.org): any past day, or the latest list. */
async function fromMirror(currency: string, date: string, today: string): Promise<Attempt> {
  let body: unknown;
  try {
    body = await publicJson(nbsUrl(date < today ? date : null), 10_000);
  } catch (error) {
    return failed(error);
  }
  const rows = (body as { rates?: unknown } | null)?.rates;
  if (!Array.isArray(rows)) return { failure: 'shape', detail: null };
  const rate = parseNbsRate(body, currency);
  return rate === null ? { failure: 'unlisted', detail: null } : { rate };
}

/** The NBS's own page: it lists the rates in force, so it can only answer for today or later. */
async function fromNbsPage(currency: string): Promise<Attempt> {
  let html: string;
  try {
    html = await publicText(nbsPageUrl, 10_000);
  } catch (error) {
    return failed(error);
  }
  const rate = parseNbsPage(html, currency);
  return rate === null ? { failure: 'shape', detail: null } : { rate };
}

/**
 * RSD per one unit on `date` with the reason when there is none. Today and later ask for the latest
 * list, which is the rate in force. The mirror comes first; when it is down or unreadable the
 * NBS's own list is tried (for today or later). A currency the list does not have is not retried.
 */
export async function getNbsRate(
  currency: string,
  date: string,
  today: string,
): Promise<NbsResult> {
  const first = await fromMirror(currency, date, today);
  if ('rate' in first) return { rate: first.rate, source: 'resenje', failure: null, detail: null };
  if (first.failure === 'unlisted' || date < today) {
    return { rate: null, source: null, ...first };
  }
  const second = await fromNbsPage(currency);
  if ('rate' in second) return { rate: second.rate, source: 'nbs', failure: null, detail: null };
  // Both failed: report the mirror's cause, which is the main source.
  return { rate: null, source: null, ...first };
}

/** The rate alone, null when it cannot be had. */
export async function fetchNbsRate(
  currency: string,
  date: string,
  today: string,
): Promise<number | null> {
  return (await getNbsRate(currency, date, today)).rate;
}
