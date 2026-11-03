import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  checked: boolean;
  /** Accessible name; the row shows the habit's name. */
  label: string;
  /** The habit's own color: the fill when done, the outline when not. Without it, the accent. */
  color?: string;
  onPress: () => void;
  testID: string;
};

// The circle is 44; the slop brings the touch target to 48 (agent-rules/12, review-lessons L-007).
const hitSlop = { top: 2, bottom: 2, left: 2, right: 2 };

/**
 * Round "done today" check (decided at checkpoint A of #7): a circle filled with the habit's color
 * (accent without one) and a check when done, a ring in the color when not. Private to Habits until a second module needs one.
 */
export function HabitCheck({ checked, label, color, onPress, testID }: Props) {
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
          ? { backgroundColor: color ?? theme.accent, borderColor: color ?? theme.accent }
          : color
            ? { backgroundColor: theme.control, borderColor: color, borderWidth: 2 }
            : { backgroundColor: theme.control, borderColor: theme.controlBorder },
        pressed && styles.pressed,
      ]}>
      {checked && (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={Layout.control.glyph}
          tintColor={color ? theme.background : theme.onAccent}
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
