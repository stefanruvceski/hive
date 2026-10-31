import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  description?: string;
  testID: string;
};

/**
 * Designed empty state — a successful query with no data is never a blank screen. Scrolls, so at
 * the largest text sizes the copy is never cut off.
 */
export function EmptyState({ title, description, testID }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container} testID={testID}>
      <ThemedText role="heading" type="stateTitle" style={styles.centerText}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText type="stateBody" style={styles.centerText}>
          {description}
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
});
