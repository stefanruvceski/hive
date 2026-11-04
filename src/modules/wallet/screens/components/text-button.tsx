import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** `danger` for a step that undoes something. */
  tone?: 'accent' | 'danger';
  testID: string;
};

/** A quiet text action (Merge, Unmerge, Not the same). 44 pt high. */
export function TextButton({ label, onPress, disabled = false, tone = 'accent', testID }: Props) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={styles.button}
      testID={testID}>
      <ThemedText
        themeColor={disabled ? 'textQuaternary' : tone === 'danger' ? 'danger' : 'accentText'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: Layout.minTouch, justifyContent: 'center' },
});
