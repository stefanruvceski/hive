import type { NativeStackNavigationOptions } from 'expo-router';

import { Colors } from '@/constants/theme';

/**
 * How the root Stack presents an open group folder (docs/agent-rules/02 §6): a see-through modal
 * over Home that fades in, like an App Library folder. The folder draws its own blurred, dimmed
 * backdrop; a tap on it, Android's back button or the VoiceOver escape gesture closes it.
 */
export function groupFolderOptions(scheme: 'light' | 'dark'): NativeStackNavigationOptions {
  return {
    presentation: 'transparentModal',
    animation: 'fade',
    headerShown: false,
    contentStyle: { backgroundColor: Colors[scheme].clear },
  };
}
