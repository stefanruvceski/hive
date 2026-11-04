import { queryOptions, useQuery } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';

import { fetchNbsRate } from './fx-client';
import { moneyKeys } from './queries';
import { moneyRates } from './schema';

export const nbsRateQuery = (currency: string, date: string, today: string) =>
  queryOptions({
    queryKey: [...moneyKeys.rates(), 'nbs', currency, date, today] as const,
    queryFn: async () => {
      const rate = await fetchNbsRate(currency, date, today);
      // Kept for offline use and for recurring rules; a rate typed by hand for that day stays.
      if (rate !== null) {
        getDb()
          .insert(moneyRates)
          .values({ currency, date, rate, source: 'nbs' })
          .onConflictDoNothing()
          .run();
      }
      return rate;
    },
    networkMode: 'online',
    retry: false,
    staleTime: Infinity,
  });

/** The NBS rate for a foreign currency on a day; idle for RSD or an incomplete date. */
export function useNbsRate(currency: string | null, date: string, today: string) {
  return useQuery({
    ...nbsRateQuery(currency ?? '', date, today),
    enabled: currency !== null,
  });
}
