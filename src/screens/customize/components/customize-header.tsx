import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout } from '@/constants/theme';

/** "Customize Home" (wraps at large text sizes, never cut off) and Done, which keeps its width. */
export function CustomizeHeader({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.header}>
      <ThemedText type="title" role="heading" style={styles.title} testID="customize-title">
        Customize Home
      </ThemedText>
      <View style={styles.done}>
        <PrimaryButton label="Done" size="compact" onPress={onDone} testID="customize-done" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.gridGapAcross,
  },
  title: {
    flex: 1,
  },
  done: {
    flexShrink: 0,
  },
});
