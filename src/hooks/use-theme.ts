/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Effects } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The resolved scheme: anything but `dark` renders light. */
export function useThemeName(): 'light' | 'dark' {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useThemeName()];
}

/** Gradients and shadows for the current scheme. */
export function useThemeEffects() {
  return Effects[useThemeName()];
}
