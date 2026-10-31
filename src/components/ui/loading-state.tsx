import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Standard loading state for screens/sections driven by a query. */
export function LoadingState({ testID }: { testID: string }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container} testID={testID} aria-busy>
      <ActivityIndicator color={theme.textSecondary} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
