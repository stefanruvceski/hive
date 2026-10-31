import { type ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Global render-error fallback. Friendly copy only — never raw error messages. */
export function ErrorFallback({ retry }: ErrorBoundaryProps) {
  return (
    <ThemedView style={styles.container} testID="app-error">
      <ThemedText type="subtitle" style={styles.centerText}>
        Something went wrong.
      </ThemedText>
      <Pressable
        role="button"
        aria-label="Try again"
        testID="app-error-retry"
        hitSlop={12}
        onPress={() => void retry()}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.button}>
          <ThemedText type="small">Try again</ThemedText>
        </ThemedView>
      </Pressable>
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
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
