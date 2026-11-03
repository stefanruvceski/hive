import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** Names the target for a screen reader when the label alone is ambiguous in a list. */
  accessibilityLabel?: string;
  testID: string;
};

/** Plain text action (Archive, Restore, Delete permanently): 48 pt high, accent or danger. */
export function TextButton({ label, onPress, destructive, accessibilityLabel, testID }: Props) {
  return (
    <Pressable
      role="button"
      aria-label={accessibilityLabel ?? label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedText themeColor={destructive ? 'danger' : 'accent'}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Layout.minTouchAndroid,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
