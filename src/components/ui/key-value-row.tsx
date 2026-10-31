import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** From ~1.5× text (iOS accessibility sizes, Android 14+ top steps) a side-by-side value is too narrow. */
const STACK_FONT_SCALE = 1.5;

type Props = {
  label: string;
  value: string;
  /** Applied to the value text (the part tests and Maestro assert); the row gets `${testID}-row`. */
  testID?: string;
};

/**
 * Label + value row. The label keeps its width and a long value wraps instead of overflowing.
 * At accessibility text sizes the value stacks under the label, like iOS Settings.
 */
export function KeyValueRow({ label, value, testID }: Props) {
  const stacked = useWindowDimensions().fontScale >= STACK_FONT_SCALE;

  return (
    <View style={stacked ? styles.stacked : styles.row} testID={testID && `${testID}-row`}>
      <ThemedText type="body" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText
        type="code"
        themeColor="textSecondary"
        style={stacked ? styles.stackedValue : styles.value}
        testID={testID}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  stacked: {
    flexDirection: 'column',
    gap: Spacing.half,
  },
  label: {
    flexShrink: 0,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  stackedValue: {
    textAlign: 'left',
  },
});
