import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  description?: string;
  testID: string;
};

/** Designed empty state — a successful query with no data is never a blank screen. */
export function EmptyState({ title, description, testID }: Props) {
  return (
    <ThemedView style={styles.container} testID={testID}>
      <ThemedText type="subtitle" style={styles.centerText}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {description}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
});
