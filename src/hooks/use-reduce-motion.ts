import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The phone's Reduce Motion setting, for motion that isn't run by Reanimated (a ScrollView's
 * animated `scrollTo`). False until the first answer arrives; follows changes while mounted.
 * Reanimated animations gate on Reanimated's own `useReducedMotion()` (agent-rules/12 §6).
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch((error: unknown) => console.warn('reduce-motion: could not read the setting', error));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
