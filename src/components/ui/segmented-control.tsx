import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group ("Appearance"). */
  label: string;
  /** On the group; each option gets `${testID}-${value}`. */
  testID: string;
};

// Segments are 38 high; the slop brings the touch target to 48 (agent-rules/12).
const hitSlop = { top: 5, bottom: 5 };

/**
 * Single-choice segmented control drawn from the design (docs/design/canvas/Settings.dc.html):
 * equal segments on a tinted track, the chosen one a teal pill. Drawn, not `@expo/ui`, so it looks
 * the same on iOS and Android (agent-rules/03 §4).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  testID,
}: Props<T>) {
  const theme = useTheme();

  return (
    // Not `accessible`: that would merge the segments into one element on iOS.
    <View
      role="radiogroup"
      aria-label={label}
      testID={testID}
      style={[styles.track, { backgroundColor: theme.segmentTrack }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            hitSlop={hitSlop}
            onPress={() => onChange(option.value)}
            testID={`${testID}-${option.value}`}
            style={[
              styles.segment,
              // RN borders sit inside the box, so only the chosen segment needs one.
              selected && [
                styles.selected,
                {
                  backgroundColor: theme.segmentSelected,
                  borderColor: theme.segmentSelectedBorder,
                },
              ],
            ]}>
            {({ pressed }) => (
              <ThemedText
                type={selected ? 'segmentSelected' : 'segment'}
                themeColor={selected ? 'accentText' : 'textSecondary'}
                style={[styles.label, pressed && styles.pressed]}>
                {option.label}
              </ThemedText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: Layout.segmented.trackPadding,
    borderRadius: Layout.segmented.trackRadius,
  },
  segment: {
    flex: 1,
    minHeight: Layout.segmented.height,
    borderRadius: Layout.segmented.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 1,
  },
  // Wraps at large text sizes instead of truncating (agent-rules/03 §2).
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
