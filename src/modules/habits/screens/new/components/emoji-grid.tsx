import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  emojis: readonly string[];
  value: string;
  onChange: (emoji: string) => void;
  /** On the group; each emoji gets `${testID}-${index}` (emoji make poor ids for Maestro). */
  testID: string;
};

/**
 * Single-choice emoji grid. The chosen cell uses the segmented control's selection tokens, so
 * "chosen" looks the same across the app. Cells are at least the touch minimum and grow with the
 * system text size; the grid wraps.
 */
export function EmojiGrid({ emojis, value, onChange, testID }: Props) {
  const theme = useTheme();

  return (
    // Not `accessible`: that would merge the cells into one element on iOS.
    <View role="radiogroup" aria-label="Emoji" testID={testID} style={styles.grid}>
      {emojis.map((emoji, index) => {
        const selected = emoji === value;
        return (
          <Pressable
            key={emoji}
            role="radio"
            aria-checked={selected}
            aria-label={emoji}
            onPress={() => onChange(emoji)}
            testID={`${testID}-${index}`}
            style={[
              styles.cell,
              // RN borders sit inside the box, so only the chosen cell needs one.
              selected && [
                styles.selected,
                {
                  backgroundColor: theme.segmentSelected,
                  borderColor: theme.segmentSelectedBorder,
                },
              ],
            ]}>
            {({ pressed }) => <ThemedText style={pressed && styles.pressed}>{emoji}</ThemedText>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  cell: {
    minWidth: Layout.minTouch,
    minHeight: Layout.minTouch,
    borderRadius: Layout.listRow.icon.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
