import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Fonts, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { TimeOfDay } from '../../../data/schema';
import { canSave, normalizeName, timeOfDayOptions } from '../../../domain/habits';

type Props = {
  onAdd: (todo: { title: string; timeOfDay: TimeOfDay }) => void;
};

/** One line to add a to-do for today; the part of the day to put it in shows once there is a title. */
export function TodoAdd({ onAdd }: Props) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');

  const submit = () => {
    if (!canSave(title)) return;
    onAdd({ title: normalizeName(title), timeOfDay });
    setTitle('');
  };

  return (
    <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.card}>
      <View style={styles.row}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={submit}
          placeholder="Add a to-do"
          placeholderTextColor={theme.textQuaternary}
          selectionColor={theme.accent}
          cursorColor={theme.accent}
          aria-label="New to-do"
          returnKeyType="done"
          style={[styles.input, { color: theme.text }]}
          testID="habits-todo-add-input"
        />
        <PrimaryButton
          label="Add"
          size="compact"
          onPress={submit}
          disabled={!canSave(title)}
          testID="habits-todo-add-submit"
        />
      </View>
      {canSave(title) && (
        <SegmentedControl
          label="Part of the day"
          options={timeOfDayOptions}
          value={timeOfDay}
          onChange={setTimeOfDay}
          testID="habits-todo-add-time"
        />
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  // ThemedText's `row` type (17, system font); a TextInput can't use ThemedText.
  input: {
    flex: 1,
    minHeight: Layout.minTouch,
    paddingHorizontal: Spacing.two,
    fontFamily: Fonts.sans,
    fontSize: 17,
  },
});
