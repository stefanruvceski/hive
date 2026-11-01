import { isLiquidGlassAvailable } from 'expo-glass-effect';
import type { NativeStackNavigationOptions } from 'expo-router';

import { Colors, Layout } from '@/constants/theme';

/**
 * How the root Stack presents the group sheet (docs/agent-rules/02 §6): a native form sheet that
 * rests at ≈ the design's height and expands to full height for long groups or large text. iOS draws
 * the grabber; on iOS 26+ the content is see-through so the system's Liquid Glass sheet shows (the
 * design's floating, frosted sheet), elsewhere it gets the opaque `sheet` fill. Android sheets have no
 * header.
 */
export function groupSheetOptions(scheme: 'light' | 'dark'): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    headerShown: false,
    sheetAllowedDetents: [...Layout.sheet.detents],
    sheetInitialDetentIndex: 0,
    sheetGrabberVisible: true,
    sheetCornerRadius: Layout.radius.sheet,
    contentStyle: {
      backgroundColor: isLiquidGlassAvailable() ? Colors[scheme].clear : Colors[scheme].sheet,
    },
  };
}
