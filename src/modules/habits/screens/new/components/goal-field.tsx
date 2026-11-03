import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Fonts, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { type Goal, aggregations } from '../../../domain/goal';

type Props = {
  /** The goal, or undefined for a plain yes/no habit. */
  value: Goal | undefined;
  onChange: (goal: Goal | undefined) => void;
  /** A habit to quit: its target is a limit. The switch shows only with a handler. */
  quit?: boolean;
  onQuitChange?: (quit: boolean) => void;
  /** On the field; its parts are `${testID}-unit`, `-target` and `-aggregation`. */
  testID: string;
};

const emptyGoal: Goal = { unit: '', target: 0, aggregation: 'sum' };

/** Measure a habit by an amount: what it counts, a daily target, and how amounts roll up. */
export function GoalField({ value, onChange, quit = false, onQuitChange, testID }: Props) {
  const theme = useTheme();
  // What was typed, kept as text so "2." or "" survive until the number is complete.
  const [targetText, setTargetText] = useState(
    value && value.target > 0 ? String(value.target) : '',
  );
  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.controlBorder }];

  return (
    <View style={styles.field}>
      {onQuitChange && (
        <View style={styles.switchRow}>
          <ThemedText>Quit habit</ThemedText>
          <ToggleSwitch
            value={quit}
            onValueChange={onQuitChange}
            label="Quit habit"
            testID={`${testID}-quit`}
          />
        </View>
      )}
      <View style={styles.switchRow}>
        <ThemedText>Measure an amount</ThemedText>
        <ToggleSwitch
          value={value !== undefined}
          onValueChange={(on) => onChange(on ? emptyGoal : undefined)}
          label="Measure an amount"
          testID={`${testID}-switch`}
        />
      </View>
      {value && (
        <>
          <View style={styles.inputs}>
            <TextInput
              value={value.unit}
              onChangeText={(unit) => onChange({ ...value, unit })}
              placeholder="Unit, e.g. glasses"
              placeholderTextColor={theme.textQuaternary}
              selectionColor={theme.accent}
              cursorColor={theme.accent}
              aria-label="Unit"
              autoCapitalize="none"
              style={[...inputStyle, styles.unit]}
              testID={`${testID}-unit`}
            />
            <TextInput
              value={targetText}
              onChangeText={(text) => {
                setTargetText(text);
                const target = Number(text.replace(',', '.'));
                onChange({ ...value, target: Number.isFinite(target) ? target : 0 });
              }}
              placeholder={quit ? 'Daily limit' : 'Daily target'}
              placeholderTextColor={theme.textQuaternary}
              selectionColor={theme.accent}
              cursorColor={theme.accent}
              aria-label={quit ? 'Daily limit' : 'Daily target'}
              keyboardType="decimal-pad"
              style={[...inputStyle, styles.target]}
              testID={`${testID}-target`}
            />
          </View>
          <SegmentedControl
            label="Combine amounts"
            options={aggregations}
            value={value.aggregation}
            onChange={(aggregation) => onChange({ ...value, aggregation })}
            testID={`${testID}-aggregation`}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.three,
  },
  switchRow: {
    minHeight: Layout.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  // ThemedText's `row` type (17, system font); a TextInput can't use ThemedText.
  input: {
    minHeight: Layout.minTouch,
    borderWidth: 1,
    borderRadius: Layout.listRow.icon.radius,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.sans,
    fontSize: 17,
  },
  unit: {
    flex: 3,
  },
  target: {
    flex: 2,
  },
});
