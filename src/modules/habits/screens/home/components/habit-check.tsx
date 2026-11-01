import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  checked: boolean;
  /** Accessible name; the row shows the habit's name. */
  label: string;
  onPress: () => void;
  testID: string;
};

// The circle is 44; the slop brings the touch target to 48 (agent-rules/12, review-lessons L-007).
const hitSlop = { top: 2, bottom: 2, left: 2, right: 2 };

/**
 * Round "done today" check (decided at checkpoint A of #7): an accent-filled circle with a check
 * when done, a control ring when not. Private to Habits until a second module needs one.
 */
export function HabitCheck({ checked, label, onPress, testID }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      hitSlop={hitSlop}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.circle,
        checked
          ? { backgroundColor: theme.accent, borderColor: theme.accent }
          : { backgroundColor: theme.control, borderColor: theme.controlBorder },
        pressed && styles.pressed,
      ]}>
      {checked && (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={Layout.control.glyph}
          tintColor={theme.onAccent}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: Layout.control.size,
    height: Layout.control.size,
    borderRadius: Layout.control.size / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
