import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { firstGrapheme } from '../../../domain/habits';

type Props = {
  emojis: readonly string[];
  value: string;
  onChange: (emoji: string) => void;
  /** On the group; each emoji gets `${testID}-${index}` (emoji make poor ids for Maestro). */
  testID: string;
  /** Rows of the scrolling grid. */
  rows?: number;
};

/**
 * Single-choice emoji grid that scrolls sideways, so more emojis never make the form taller. The
 * first cell is a text field: tap it and type any emoji from the keyboard. The chosen cell uses the
 * segmented control's selection tokens, so "chosen" looks the same across the app. Cells are at
 * least the touch minimum.
 */
export function EmojiGrid({ emojis, value, onChange, testID, rows = 4 }: Props) {
  const theme = useTheme();
  const custom = !emojis.includes(value);
  const selectedStyle = {
    backgroundColor: theme.segmentSelected,
    borderColor: theme.segmentSelectedBorder,
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      testID={`${testID}-scroll`}>
      {/* Not `accessible`: that would merge the cells into one element on iOS. */}
      <View
        role="radiogroup"
        aria-label="Emoji"
        testID={testID}
        style={[styles.grid, { height: rows * Layout.minTouch + (rows - 1) * Spacing.two }]}>
        <TextInput
          value={custom ? value : ''}
          onChangeText={(text) => {
            const emoji = firstGrapheme(text);
            if (emoji) onChange(emoji);
          }}
          placeholder="＋"
          placeholderTextColor={theme.textQuaternary}
          selectionColor={theme.accent}
          cursorColor={theme.accent}
          aria-label="Type any emoji"
          autoCorrect={false}
          style={[
            styles.cell,
            styles.custom,
            { color: theme.text, borderColor: theme.textQuaternary },
            custom && [selectedStyle, styles.solid],
          ]}
          testID={`${testID}-custom`}
        />
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
              // RN borders sit inside the box, so only the chosen cell needs one.
              style={[styles.cell, selected && [styles.selected, selectedStyle]]}>
              {({ pressed }) => <ThemedText style={pressed && styles.pressed}>{emoji}</ThemedText>}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    width: Layout.minTouch,
    height: Layout.minTouch,
    borderRadius: Layout.listRow.icon.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custom: {
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontSize: 20,
    padding: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  solid: {
    borderStyle: 'solid',
  },
  selected: {
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
