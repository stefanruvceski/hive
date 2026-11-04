import { queryOptions, useQuery } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';

import { getNbsRate } from './fx-client';
import { moneyKeys } from './queries';
import { moneyRates } from './schema';
import { failureText } from '../domain/fx';

export const nbsRateQuery = (currency: string, date: string, today: string) =>
  queryOptions({
    queryKey: [...moneyKeys.rates(), 'nbs', currency, date, today] as const,
    queryFn: async () => {
      const { rate, failure, detail } = await getNbsRate(currency, date, today);
      // Kept for offline use and for recurring rules; a rate typed by hand for that day stays.
      if (rate !== null) {
        getDb()
          .insert(moneyRates)
          .values({ currency, date, rate, source: 'nbs' })
          .onConflictDoNothing()
          .run();
      }
      return { rate, failure: failure === null ? null : failureText(failure, currency, detail) };
    },
    networkMode: 'online',
    retry: false,
    staleTime: Infinity,
  });

/**
 * The NBS rate for a foreign currency on a day; idle for RSD or an incomplete date. `failure` says
 * why there is none ("no connection to the rate service", …) so the screen can tell the user.
 */
export function useNbsRate(currency: string | null, date: string, today: string) {
  const query = useQuery({
    ...nbsRateQuery(currency ?? '', date, today),
    enabled: currency !== null,
  });
  return {
    data: query.data === undefined ? undefined : query.data.rate,
    failure: query.data?.failure ?? null,
    isFetching: query.isFetching,
  };
}
