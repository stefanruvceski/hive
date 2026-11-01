import type { NativeStackNavigationOptions } from 'expo-router';

import { Colors } from '@/constants/theme';

/**
 * How the root Stack presents Customize Home (docs/agent-rules/02 §6, #31): a full-screen modal
 * (iOS UIModalPresentationFullScreen; Android falls back to `modal`) with its own title and Done,
 * like the design, instead of a sheet with Home above it. Every edit is saved at once, so leaving
 * by Done or Android's back button loses nothing.
 */
export function customizeOptions(scheme: 'light' | 'dark'): NativeStackNavigationOptions {
  return {
    presentation: 'fullScreenModal',
    headerShown: false,
    contentStyle: { backgroundColor: Colors[scheme].background },
  };
}
