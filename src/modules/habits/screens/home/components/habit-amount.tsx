import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { amountProgress, formatAmount } from '../../../domain/goal';

type Props = {
  /** Accessible name; the row shows the habit's name. */
  label: string;
  /** Logged today, if anything. */
  amount?: number;
  target: number;
  /** A habit to quit: `target` is a limit. Staying under shows the amount; over it turns red. */
  quit?: boolean;
  /** The habit's own color. */
  color: string;
  /** Opens the amount sheet. */
  onPress: () => void;
  testID: string;
};

// The circle is 34; the slop brings the touch target to 48 (agent-rules/12, review-lessons L-007).
const SIZE = 34;
const hitSlop = { top: 7, bottom: 7, left: 7, right: 7 };

/**
 * The "done today" control of a measurable habit: a circle that fills from the bottom as the amount
 * grows, shows the amount (or + before any), and turns into a filled check at the target.
 */
export function HabitAmount({
  label,
  amount,
  target,
  quit = false,
  color,
  onPress,
  testID,
}: Props) {
  const theme = useTheme();
  const progress = amount === undefined ? 0 : amountProgress(amount, target);
  const done = !quit && progress >= 1;
  const over = quit && amount !== undefined && amount > target;
  const ring = over ? theme.danger : color;

  return (
    <Pressable
      role="button"
      aria-label={label}
      hitSlop={hitSlop}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.circle,
        { borderColor: ring, backgroundColor: done ? color : theme.control },
        pressed && styles.pressed,
      ]}>
      {!done && progress > 0 && (
        <View
          style={[styles.fill, { backgroundColor: `${ring}66`, height: `${progress * 100}%` }]}
        />
      )}
      {done ? (
        <View testID={`${testID}-done`}>
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={Layout.control.glyph}
            tintColor={theme.background}
          />
        </View>
      ) : (
        <ThemedText type="footnote" themeColor={over ? 'danger' : 'text'} numberOfLines={1}>
          {amount === undefined ? '+' : formatAmount(amount)}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
  },
  pressed: {
    opacity: 0.6,
  },
});
