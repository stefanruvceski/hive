import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toIsoDate } from '@/utils/format-date';

/** The next local midnight after `now`. Built from calendar fields, so DST days stay one day long. */
export function nextLocalMidnight(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

/**
 * The phone's local date (`YYYY-MM-DD`, as stored). Changes at local midnight while the app is open
 * and is re-read when the app comes back to the foreground (timers pause while it sleeps, and the
 * time zone may have changed).
 */
export function useToday(): string {
  const [today, setToday] = useState(() => toIsoDate(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setToday(toIsoDate(now));
      // Rescheduled from the clock each time, so a timer that fires early simply runs again.
      timer = setTimeout(refresh, nextLocalMidnight(now).getTime() - now.getTime());
    };
    const now = new Date();
    timer = setTimeout(refresh, nextLocalMidnight(now).getTime() - now.getTime());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
