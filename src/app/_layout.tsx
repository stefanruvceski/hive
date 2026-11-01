import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppearanceGate } from '@/components/appearance-gate';
import { ErrorFallback } from '@/components/error-fallback';
import { Colors } from '@/constants/theme';
import { useThemeName } from '@/hooks/use-theme';
import { getDb } from '@/lib/db/client';
import migrations from '@/lib/db/migrations/migrations';
import { queryClient } from '@/lib/query-client';
import { groupSheetOptions } from '@/screens/group-sheet/sheet-options';

void SplashScreen.preventAutoHideAsync();

// `anchor` keeps Home under every deep link, so Back, Android's back button and iOS swipe-back
// return to it even after a cold start (review of #42). `screenErrorBoundary` keeps navigator
// chrome mounted when a screen throws; inherited by nested layouts.
export const unstable_settings = { anchor: 'index', screenErrorBoundary: ErrorFallback };

export { ErrorFallback as ErrorBoundary };

export default function RootLayout() {
  const scheme = useThemeName();
  // Every module's tables are migrated before any screen renders (docs/agent-rules/07 §8).
  const { success, error } = useMigrations(getDb(), migrations);

  useEffect(() => {
    // On success `AppearanceGate` hides the splash once the saved appearance is applied.
    if (error) void SplashScreen.hideAsync();
  }, [error]);

  if (error) throw error;
  if (!success) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AppearanceGate>
          <ThemeProvider value={navigationTheme[scheme]}>
            <Stack>
              {/* Presentation is navigator-level, so it lives here (agent-rules/02 §5). */}
              <Stack.Screen name="group/[id]" options={groupSheetOptions(scheme)} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </AppearanceGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

// Navigator chrome (headers, screen background) from the same tokens as the screens.
const navigationTheme = {
  light: navigationThemeFrom(DefaultTheme, Colors.light),
  dark: navigationThemeFrom(DarkTheme, Colors.dark),
};

function navigationThemeFrom(base: typeof DefaultTheme, colors: (typeof Colors)['light' | 'dark']) {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accentText,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.separator,
      notification: colors.danger,
    },
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
