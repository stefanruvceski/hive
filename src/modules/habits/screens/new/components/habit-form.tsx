import { router } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SaveButton } from '@/components/ui/save-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Fonts, Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ColorGrid } from './color-grid';
import { EmojiGrid } from './emoji-grid';
import { FormGroup } from './form-group';
import { GoalField } from './goal-field';
import { ScheduleField } from './schedule-field';
import type { TimeOfDay } from '../../../data/schema';
import { type Goal, isValidGoal } from '../../../domain/goal';
import {
  canSave,
  allHabitEmojis,
  defaultEmoji,
  type NewHabit,
  timeOfDayOptions,
} from '../../../domain/habits';
import { type Schedule, isValidSchedule } from '../../../domain/schedule';

/** A new habit is daily; the weekly count a switch to Weekly starts from. */
const dailySchedule: Schedule = { type: 'daily', days: [], times: 3 };

type Props = {
  /** Prefix of every testID: `habits-new` for the add form, `habits-edit` for the edit form. */
  testID: string;
  title: string;
  /** The draft the form opens with; the add form starts blank. */
  initial?: NewHabit;
  /** Persists the draft; the form closes on success and unlocks Save on error. */
  onSave: (draft: NewHabit, callbacks: { onSuccess: () => void; onError: () => void }) => void;
  isPending: boolean;
  isError: boolean;
  /** Extra controls under Save (the edit form's Archive). */
  children?: ReactNode;
};

/** The habit form shared by Add and Edit: name, emoji, color, part of the day, schedule, goal. */
export function HabitForm({ testID, title, initial, onSave, isPending, isError, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The draft lives here until Save (07 §7); a failed save keeps it.
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? defaultEmoji);
  // A `HabitColors` key; undefined = Automatic (from the habit's id).
  const [color, setColor] = useState<string | undefined>(initial?.color);
  const [schedule, setSchedule] = useState<Schedule>(initial?.schedule ?? dailySchedule);
  const [goal, setGoal] = useState<Goal | undefined>(initial?.goal);
  const [quit, setQuit] = useState(initial?.quit ?? false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(initial?.timeOfDay ?? 'anytime');
  // `isPending` disables Save only after a re-render; this stops a second quick tap before it.
  // Cleared only on error: after a save the form is on its way out and stays locked.
  const saving = useRef(false);

  const valid = canSave(name) && isValidSchedule(schedule) && (!goal || isValidGoal(goal));

  // Back and Save both land on the list, also when the form was opened by deep link.
  const close = () => router.dismissTo('/habits');

  const save = () => {
    if (saving.current) return;
    saving.current = true;
    // The mutation trims and validates the name (07 §7).
    onSave(
      {
        name,
        emoji,
        timeOfDay,
        color,
        schedule: schedule.type === 'daily' ? undefined : schedule,
        goal,
        quit: quit ? true : undefined,
      },
      {
        onSuccess: close,
        onError: () => {
          saving.current = false;
        },
      },
    );
  };

  return (
    <Wallpaper style={styles.container} testID={`${testID}-screen`}>
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.headerWrap}>
          <ScreenHeader
            title={title}
            onBack={close}
            backTestID={`${testID}-back`}
            titleTestID={`${testID}-title`}
            trailing={
              <SaveButton onPress={save} disabled={!valid || isPending} testID={`${testID}-save`} />
            }
          />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          testID={`${testID}-scroll`}>
          <FormGroup title="Name" testID={`${testID}-name-group`}>
            <View style={styles.nameRow}>
              <ThemedText aria-hidden>{emoji}</ThemedText>
              {/* RN TextInput: @expo/ui's TextInput has no Jest implementation (checkpoint B). */}
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Read 10 pages"
                placeholderTextColor={theme.textQuaternary}
                selectionColor={theme.accent}
                cursorColor={theme.accent}
                aria-label="Name"
                autoCapitalize="sentences"
                returnKeyType="done"
                style={[styles.input, { color: theme.text }]}
                testID={`${testID}-name`}
              />
            </View>
          </FormGroup>

          <FormGroup padded testID={`${testID}-emoji-group`}>
            <EmojiGrid
              emojis={allHabitEmojis}
              value={emoji}
              onChange={setEmoji}
              testID={`${testID}-emoji`}
              rows={3}
            />
          </FormGroup>

          <FormGroup padded testID={`${testID}-color-group`}>
            <ColorGrid value={color} onChange={setColor} testID={`${testID}-color`} />
          </FormGroup>

          <FormGroup title="Part of the day" padded testID={`${testID}-time-group`}>
            <SegmentedControl
              label="Part of the day"
              options={timeOfDayOptions}
              value={timeOfDay}
              onChange={setTimeOfDay}
              testID={`${testID}-time`}
            />
          </FormGroup>

          <FormGroup padded testID={`${testID}-schedule-group`}>
            <ScheduleField value={schedule} onChange={setSchedule} testID={`${testID}-schedule`} />
          </FormGroup>

          <FormGroup padded testID={`${testID}-goal-group`}>
            <GoalField
              value={goal}
              onChange={setGoal}
              quit={quit}
              onQuitChange={setQuit}
              testID={`${testID}-goal`}
            />
          </FormGroup>

          {isError && (
            <ThemedText
              type="footnote"
              themeColor="danger"
              role="alert"
              style={styles.inset}
              testID={`${testID}-error`}>
              {"Couldn't save the habit. Try again."}
            </ThemedText>
          )}
          {children}
        </ScrollView>
      </SafeAreaView>
    </Wallpaper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  headerWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
  },
  nameRow: {
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
  },
  // ThemedText's `row` type (17, system font); a TextInput can't use ThemedText.
  input: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 17,
    paddingVertical: Spacing.two,
  },
  inset: {
    marginHorizontal: Layout.listRow.paddingHorizontal,
  },
});
