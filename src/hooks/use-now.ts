import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, re-read whenever the app comes back to the foreground — enough for text such as
 * Home's greeting and date, which would otherwise stay as they were when the screen mounted.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => subscription.remove();
  }, []);

  return now;
}
