import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Standard loading state for screens/sections driven by a query. */
export function LoadingState({ testID }: { testID: string }) {
  const theme = useTheme();

  return (
    <View style={styles.container} testID={testID} aria-busy>
      <ActivityIndicator color={theme.textSecondary} />
    </View>
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
