import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';

type Props = {
  error: unknown;
  onRetry: () => void;
  testID: string;
};

// Friendly copy only — raw server messages never reach users (agent-rules/14 §3).
function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'You need to sign in to see this.';
    }
    if (error.status === 404) {
      return "We couldn't find what you were looking for.";
    }
  }
  return 'Something went wrong. Please try again.';
}

/** Standard error state for screens/sections driven by a query. Wire `onRetry` to `refetch`. */
export function ErrorState({ error, onRetry, testID }: Props) {
  return (
    <View style={styles.container} testID={testID}>
      <ThemedText style={styles.centerText}>{messageFor(error)}</ThemedText>
      <PrimaryButton label="Try again" testID={`${testID}-retry`} onPress={onRetry} />
    </View>
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
