import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  /** Shown but not usable yet; the label dims. */
  disabled?: boolean;
  testID: string;
};

/** Accent-filled primary action ("Customize Home", "Try again" in docs/design/canvas/Empty.dc.html). */
export function PrimaryButton({ label, onPress, disabled = false, testID }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={label}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      aria-disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.accent },
        (pressed || disabled) && styles.pressed,
      ]}>
      <ThemedText type="button" themeColor="onAccent" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Layout.button.height,
    paddingHorizontal: Layout.button.paddingHorizontal,
    borderRadius: Layout.button.height / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
