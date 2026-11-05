import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { PillRows } from '@/components/ui/pill-rows';
import { Fonts, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A titled glass group, as in the Habits forms. */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {title ? (
        <ThemedText type="listHeader" role="heading">
          {title}
        </ThemedText>
      ) : null}
      <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.surface}>
        {children}
      </GlassSurface>
    </View>
  );
}

type FieldProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'onEndEditing'
  | 'placeholder'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'maxLength'
> & {
  label: string;
  testID: string;
};

/** A single-line text field with an accessible label. */
export function Field({ label, testID, ...rest }: FieldProps) {
  const theme = useTheme();
  return (
    <TextInput
      aria-label={label}
      placeholderTextColor={theme.textQuaternary}
      selectionColor={theme.accent}
      testID={testID}
      style={[styles.input, { color: theme.text }]}
      {...rest}
    />
  );
}

export type ChipOption<T extends string> = { value: T; label: string };

/** Choices in at most two rows, scrolling sideways past that; the chosen one is filled with the accent. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  idPrefix,
}: {
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  idPrefix: string;
}) {
  const theme = useTheme();
  const pills = options.map((option) => {
    const selected = option.value === value;
    return {
      key: option.value,
      node: (
        <Pressable
          key={option.value}
          role="radio"
          aria-checked={selected}
          aria-label={option.label}
          onPress={() => onChange(option.value)}
          testID={`${idPrefix}-${option.value}`}
          style={[
            styles.chip,
            { borderColor: theme.controlBorder },
            selected && { backgroundColor: theme.accent, borderColor: theme.accent },
          ]}>
          <ThemedText type="footnote" themeColor={selected ? 'onAccent' : 'text'}>
            {option.label}
          </ThemedText>
        </Pressable>
      ),
    };
  });
  return (
    <View style={styles.chips}>
      <PillRows pills={pills} />
    </View>
  );
}

/** A tappable row inside a group: a title, an optional value and a chevron. */
export function LinkRow({
  title,
  value,
  onPress,
  testID,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      role="button"
      aria-label={title}
      onPress={onPress}
      testID={testID}
      style={styles.row}>
      <ThemedText style={styles.rowTitle}>{title}</ThemedText>
      {value ? (
        <ThemedText themeColor="textTertiary" type="footnote">
          {value}
        </ThemedText>
      ) : null}
      <ThemedText themeColor="textQuaternary" aria-hidden>
        ›
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: Layout.labelGap },
  surface: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  input: {
    minHeight: Layout.minTouchAndroid,
    fontFamily: Fonts.sans,
    fontSize: 17,
  },
  chips: { paddingVertical: Spacing.one },
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: Layout.minTouchAndroid,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowTitle: { flex: 1 },
});
