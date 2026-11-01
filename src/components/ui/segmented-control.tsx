import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

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

/** From ~1.5× text four labels side by side break mid-word; the options stack (as `KeyValueRow`). */
const STACK_FONT_SCALE = 1.5;

// Segments are 38 high; the slop brings the touch target to 48 (agent-rules/12).
const hitSlop = { top: 5, bottom: 5 };

/**
 * Single-choice segmented control drawn from the design (docs/design/canvas/Settings.dc.html):
 * equal segments on a tinted track, the chosen one a teal pill. Drawn, not `@expo/ui`, so it looks
 * the same on iOS and Android (agent-rules/03 §4). At accessibility text sizes the segments stack
 * into a column so labels wrap between words, never inside one.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  testID,
}: Props<T>) {
  const theme = useTheme();
  const stacked = useWindowDimensions().fontScale >= STACK_FONT_SCALE;

  return (
    // Not `accessible`: that would merge the segments into one element on iOS.
    <View
      role="radiogroup"
      aria-label={label}
      testID={testID}
      style={[
        styles.track,
        stacked && styles.stackedTrack,
        { backgroundColor: theme.segmentTrack },
      ]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            // Stacked segments touch, so a slop would overlap the neighbour's; they are 48 high instead.
            hitSlop={stacked ? undefined : hitSlop}
            onPress={() => onChange(option.value)}
            testID={`${testID}-${option.value}`}
            style={[
              stacked ? styles.stackedSegment : styles.segment,
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
  stackedTrack: {
    flexDirection: 'column',
  },
  segment: {
    flex: 1,
    minHeight: Layout.segmented.height,
    borderRadius: Layout.segmented.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Full width, as tall as its wrapped label (no `flex: 1`, which would size it to zero height).
  // No slop when stacked, so the segment itself is the 48 a row segment reaches with its slop.
  stackedSegment: {
    minHeight: Layout.segmented.height + hitSlop.top + hitSlop.bottom,
    borderRadius: Layout.segmented.radius,
    paddingHorizontal: Layout.segmented.radius,
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
