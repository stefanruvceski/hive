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
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Fonts, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { TextButton } from './text-button';
import type { TimeOfDay } from '../../../data/schema';
import { canSave, normalizeName, timeOfDayOptions } from '../../../domain/habits';

type Props = {
  visible: boolean;
  /** Mount with a new `key` per opening. */
  title: string;
  timeOfDay: TimeOfDay;
  onSave: (edit: { title: string; timeOfDay: TimeOfDay }) => void;
  onClose: () => void;
};

/** Rename a to-do and move it to another part of the day. */
export function TodoEditSheet({ visible, title, timeOfDay, onSave, onClose }: Props) {
  const theme = useTheme();
  const [text, setText] = useState(title);
  const [part, setPart] = useState<TimeOfDay>(timeOfDay);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <Pressable
          aria-label="Close"
          onPress={onClose}
          testID="habits-todo-edit-backdrop"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.6 }]}
        />
        <GlassSurface
          kind="glass"
          radius={Layout.radius.sheet}
          style={styles.sheet}
          testID="habits-todo-edit-sheet">
          <ThemedText type="headline" role="heading">
            Edit to-do
          </ThemedText>
          <View style={[styles.field, { borderColor: theme.controlBorder }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="To-do"
              placeholderTextColor={theme.textQuaternary}
              selectionColor={theme.accent}
              cursorColor={theme.accent}
              aria-label="To-do title"
              returnKeyType="done"
              style={[styles.input, { color: theme.text }]}
              testID="habits-todo-edit-input"
            />
          </View>
          <SegmentedControl
            label="Part of the day"
            options={timeOfDayOptions}
            value={part}
            onChange={setPart}
            testID="habits-todo-edit-time"
          />
          <PrimaryButton
            label="Save"
            onPress={() => onSave({ title: normalizeName(text), timeOfDay: part })}
            disabled={!canSave(text)}
            testID="habits-todo-edit-save"
          />
          <View style={styles.actions}>
            <TextButton label="Cancel" onPress={onClose} testID="habits-todo-edit-cancel" />
          </View>
        </GlassSurface>
      </KeyboardAvoidingView>
    </Modal>
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
  field: {
    borderWidth: 1,
    borderRadius: Layout.listRow.icon.radius,
  },
  // ThemedText's `row` type (17, system font); a TextInput can't use ThemedText.
  input: {
    minHeight: Layout.minTouch,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.sans,
    fontSize: 17,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
