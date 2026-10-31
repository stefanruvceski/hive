import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';

import { useAppSettings } from '@/hooks/use-app-settings';
import { setAppColorScheme } from '@/hooks/use-color-scheme';
import { defaultAppSettings } from '@/utils/app-settings';

/**
 * Applies the saved appearance before the app shows, then keeps it in sync with Settings. Holds
 * the splash until the setting is read, so the app never flashes in the wrong scheme. If the read
 * fails the app follows the phone.
 */
export function AppearanceGate({ children }: { children: ReactNode }) {
  const { data, isPending } = useAppSettings();
  const appearance = data?.appearance ?? defaultAppSettings.appearance;

  useEffect(() => {
    if (isPending) return;
    setAppColorScheme(appearance);
    void SplashScreen.hideAsync();
  }, [isPending, appearance]);

  return isPending ? null : children;
}
