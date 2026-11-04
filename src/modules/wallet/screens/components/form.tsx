import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FieldProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'onEndEditing'
  | 'placeholder'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'maxLength'
> & { label: string; testID: string };

/** A labelled single-line field in a glass row. */
export function Field({ label, testID, ...rest }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.block}>
      <ThemedText type="listHeader" role="heading">
        {label}
      </ThemedText>
      <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.surface}>
        <TextInput
          aria-label={label}
          placeholderTextColor={theme.textQuaternary}
          selectionColor={theme.accent}
          testID={testID}
          style={[styles.input, { color: theme.text }]}
          {...rest}
        />
      </GlassSurface>
    </View>
  );
}

export type ChipOption<T extends string> = { value: T; label: string };

/**
 * Choices as filled chips, the chosen one in the accent. They wrap, or with `rows` sit in
 * that many rows that scroll sideways.
 */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  testID,
  rows,
  disabled,
}: {
  label: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID: string;
  rows?: 1 | 2;
  /** Shown dimmed and not pressable (a choice that does not apply). */
  disabled?: boolean;
}) {
  const theme = useTheme();
  const chip = (option: ChipOption<T>) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        role="radio"
        aria-checked={selected}
        aria-label={option.label}
        testID={`${testID}-${option.value}`}
        aria-disabled={disabled}
        onPress={disabled ? undefined : () => onChange(option.value)}
        hitSlop={4}
        style={[
          styles.chip,
          { backgroundColor: selected ? theme.accent : theme.segmentTrack },
          disabled && styles.disabled,
        ]}>
        <ThemedText themeColor={selected ? 'onAccent' : 'text'}>{option.label}</ThemedText>
      </Pressable>
    );
  };
  return (
    <View style={styles.block}>
      <ThemedText type="listHeader" role="heading">
        {label}
      </ThemedText>
      {rows ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} testID={`${testID}-scroll`}>
          <View style={styles.rows}>
            {Array.from({ length: rows }, (_, row) => (
              <View key={row} style={styles.line}>
                {options.filter((_, i) => i % rows === row).map(chip)}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.chips}>{options.map(chip)}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Layout.labelGap },
  surface: { paddingHorizontal: Layout.listRow.paddingHorizontal },
  input: { minHeight: Layout.listRow.minHeight, fontSize: 17 },
  rows: { gap: Spacing.two },
  line: { flexDirection: 'row', gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  disabled: { opacity: 0.4 },
  chip: {
    minHeight: Layout.minTouch,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    borderRadius: Layout.minTouch / 2,
  },
});
