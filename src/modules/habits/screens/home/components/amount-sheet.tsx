import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Fonts, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { TextButton } from './text-button';
import { amountStep, formatAmount } from '../../../domain/goal';

type Props = {
  visible: boolean;
  title: string;
  unit?: string | null;
  target: number;
  /** What is logged for the day, if anything. Mount with a new `key` per opening. */
  amount?: number;
  onSave: (amount: number) => void;
  onClear: () => void;
  onClose: () => void;
};

const round = (value: number) => Number(value.toFixed(2));

/** Log how much of a measurable habit was done on a day: a number, − / + steps, Save and Clear. */
export function AmountSheet({
  visible,
  title,
  unit,
  target,
  amount,
  onSave,
  onClear,
  onClose,
}: Props) {
  const theme = useTheme();
  const [text, setText] = useState(amount === undefined ? '' : String(amount));
  const value = text.trim() === '' ? Number.NaN : Number(text.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 0;
  const step = amountStep(target);
  const change = (delta: number) =>
    setText(String(round(Math.max(0, (valid ? value : 0) + delta))));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        {/* The backdrop is the screen's own background, dimmed: no color literal. */}
        <Pressable
          aria-label="Close"
          onPress={onClose}
          testID="habits-amount-backdrop"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.6 }]}
        />
        <GlassSurface
          kind="glass"
          radius={Layout.radius.sheet}
          style={styles.sheet}
          testID="habits-amount-sheet">
          <ThemedText type="headline" role="heading" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="footnote" themeColor="textSecondary">
            Target: {formatAmount(target, unit)}
          </ThemedText>
          <View style={styles.row}>
            <StepButton
              label="Less"
              glyph="−"
              onPress={() => change(-step)}
              testID="habits-amount-minus"
            />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="0"
              placeholderTextColor={theme.textQuaternary}
              selectionColor={theme.accent}
              cursorColor={theme.accent}
              aria-label="Amount"
              keyboardType="decimal-pad"
              style={[styles.input, { color: theme.text, borderColor: theme.controlBorder }]}
              testID="habits-amount-input"
            />
            <StepButton
              label="More"
              glyph="+"
              onPress={() => change(step)}
              testID="habits-amount-plus"
            />
          </View>
          {unit ? (
            <ThemedText type="footnote" themeColor="textSecondary" style={styles.unit}>
              {unit}
            </ThemedText>
          ) : null}
          <PrimaryButton
            label="Save"
            onPress={() => onSave(value)}
            disabled={!valid}
            testID="habits-amount-save"
          />
          <View style={styles.actions}>
            <TextButton label="Cancel" onPress={onClose} testID="habits-amount-cancel" />
            {amount !== undefined && (
              <TextButton
                label="Clear"
                destructive
                onPress={onClear}
                testID="habits-amount-clear"
              />
            )}
          </View>
        </GlassSurface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function StepButton({
  label,
  glyph,
  onPress,
  testID,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      testID={testID}
      style={[styles.step, { backgroundColor: theme.control, borderColor: theme.controlBorder }]}>
      <ThemedText type="headline" aria-hidden>
        {glyph}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: Spacing.four,
    gap: Spacing.three,
    marginHorizontal: Spacing.two,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  // ThemedText's `number` type (26, bold); a TextInput can't use ThemedText.
  input: {
    flex: 1,
    minHeight: Layout.minTouch,
    borderWidth: 1,
    borderRadius: Layout.listRow.icon.radius,
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontSize: 26,
    fontWeight: 700,
  },
  unit: {
    textAlign: 'center',
  },
  step: {
    width: Layout.minTouchAndroid,
    height: Layout.minTouchAndroid,
    borderRadius: Layout.minTouchAndroid / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
