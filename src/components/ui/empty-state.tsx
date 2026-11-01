import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  description?: string;
  /** A button under the copy ("Add habit"). */
  action?: ReactNode;
  testID: string;
};

/**
 * Designed empty state — a successful query with no data is never a blank screen. Scrolls, so at
 * the largest text sizes the copy is never cut off.
 */
export function EmptyState({ title, description, action, testID }: Props) {
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
      {action}
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
