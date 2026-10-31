import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorFallback } from '@/components/error-fallback';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDb } from '@/lib/db/client';
import migrations from '@/lib/db/migrations/migrations';
import { queryClient } from '@/lib/query-client';

void SplashScreen.preventAutoHideAsync();

// Keeps navigator chrome mounted when a screen throws; inherited by nested layouts.
export const unstable_settings = { screenErrorBoundary: ErrorFallback };

export { ErrorFallback as ErrorBoundary };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Every module's tables are migrated before any screen renders (docs/agent-rules/07 §8).
  const { success, error } = useMigrations(getDb(), migrations);

  useEffect(() => {
    // Hide once the database is ready (or failed). Move after fonts/auth bootstrap when added.
    if (success || error) void SplashScreen.hideAsync();
  }, [success, error]);

  if (error) throw error;
  if (!success) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack />
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
