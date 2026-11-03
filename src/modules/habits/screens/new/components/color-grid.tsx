import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';

import { habitColorOptions } from '../../../habit-color';

type Props = {
  /** The chosen color's key; undefined = Automatic. */
  value: string | undefined;
  onChange: (key: string | undefined) => void;
  /** On the group; each swatch gets `${testID}-${key}`, Automatic `${testID}-auto`. */
  testID: string;
};

const SWATCH = Layout.minTouch;

const label = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

/**
 * Single-choice color row that scrolls sideways: Automatic first, then the habit palette. The chosen swatch has a ring
 * and a check, so it doesn't rely on color alone. Swatches are at least the touch minimum.
 */
export function ColorGrid({ value, onChange, testID }: Props) {
  const theme = useTheme();
  const scheme = useThemeName();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* Not `accessible`: that would merge the swatches into one element on iOS. */}
      <View role="radiogroup" aria-label="Color" testID={testID} style={styles.grid}>
        <Pressable
          role="radio"
          aria-checked={value === undefined}
          aria-label="Automatic color"
          onPress={() => onChange(undefined)}
          testID={`${testID}-auto`}
          style={[
            styles.swatch,
            { borderColor: value === undefined ? theme.text : theme.textQuaternary },
            value === undefined ? styles.ring : styles.dashed,
          ]}>
          <ThemedText type="footnote" themeColor="textSecondary" aria-hidden>
            Auto
          </ThemedText>
        </Pressable>
        {habitColorOptions.map((option) => {
          const selected = option.key === value;
          return (
            <Pressable
              key={option.key}
              role="radio"
              aria-checked={selected}
              aria-label={label(option.key)}
              onPress={() => onChange(option.key)}
              testID={`${testID}-${option.key}`}
              style={({ pressed }) => [
                styles.swatch,
                { backgroundColor: option[scheme], borderColor: theme.text },
                selected && styles.ring,
                pressed && styles.pressed,
              ]}>
              {selected && (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={Layout.control.glyph}
                  tintColor={theme.background}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // RN borders sit inside the box, so only the chosen swatch needs one.
  ring: {
    borderWidth: 3,
  },
  dashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  pressed: {
    opacity: 0.6,
  },
});
