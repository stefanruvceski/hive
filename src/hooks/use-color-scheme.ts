import { Appearance } from 'react-native';

import { type Appearance as AppearanceSetting, colorSchemeOverride } from '@/utils/app-settings';

export { useColorScheme } from 'react-native';

/**
 * Applies Settings → Appearance to the whole app, native controls and status bar included.
 * `useColorScheme()` then reports the chosen scheme; System follows the phone again.
 */
export function setAppColorScheme(appearance: AppearanceSetting) {
  Appearance.setColorScheme(colorSchemeOverride(appearance));
}
