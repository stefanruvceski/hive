import * as Brightness from 'expo-brightness';
import { useFocusEffect } from 'expo-router';
import { Platform } from 'react-native';

/**
 * Full screen brightness while the screen is focused, so the code scans at the till; the previous
 * brightness comes back when the user leaves. Failures are ignored: a dim barcode still works.
 */
export function useFullBrightness() {
  useFocusEffect(() => {
    let previous: number | null = null;
    let active = true;
    void (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        if (active) await Brightness.setBrightnessAsync(1);
      } catch {
        previous = null;
      }
    })();
    return () => {
      active = false;
      void (async () => {
        try {
          if (Platform.OS === 'android') await Brightness.restoreSystemBrightnessAsync();
          else if (previous !== null) await Brightness.setBrightnessAsync(previous);
        } catch {
          // Nothing to restore.
        }
      })();
    };
  });
}
