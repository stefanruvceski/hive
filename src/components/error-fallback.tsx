import { type ErrorBoundaryProps } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';

/** Global render-error fallback. Friendly copy only — never raw error messages. */
export function ErrorFallback({ retry }: ErrorBoundaryProps) {
  return (
    <ThemedView style={styles.container} testID="app-error">
      <ThemedText type="title" style={styles.centerText}>
        Something went wrong.
      </ThemedText>
      <PrimaryButton label="Try again" testID="app-error-retry" onPress={() => void retry()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
});
