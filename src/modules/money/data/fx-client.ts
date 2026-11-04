// The only place in Money that calls the network: the NBS middle rate for a currency and day.
import { publicJson } from '@/lib/api';

import { nbsUrl, parseNbsRate } from '../domain/fx';

/**
 * RSD per one unit on `date`, or null when it cannot be had (offline, unlisted, bad answer). Today
 * and later ask for the latest list, which is the rate in force.
 */
export async function fetchNbsRate(
  currency: string,
  date: string,
  today: string,
): Promise<number | null> {
  try {
    return parseNbsRate(await publicJson(nbsUrl(date < today ? date : null), 10_000), currency);
  } catch {
    return null;
  }
}
