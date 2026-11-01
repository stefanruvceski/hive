import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Fonts, Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { EmojiGrid } from './components/emoji-grid';
import { FormGroup } from './components/form-group';
import { useCreateHabit } from '../../data/queries';
import type { TimeOfDay } from '../../data/schema';
import { canSave, defaultEmoji, habitEmojis, timeOfDayOptions } from '../../domain/habits';

/** Add habit: name, emoji, part of the day. Saves and goes back to the list. */
export function HabitsNew() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The draft lives here until Save (07 §7); a failed save keeps it.
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(defaultEmoji);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');
  const create = useCreateHabit();
  // `isPending` disables Save only after a re-render; this stops a second quick tap before it.
  // Cleared only on error: after a save the form is on its way out and stays locked.
  const saving = useRef(false);

  // Back and Save both land on the list, also when the form was opened by deep link.
  const close = () => router.dismissTo('/habits');

  const save = () => {
    if (saving.current) return;
    saving.current = true;
    // The mutation trims and validates the name (07 §7).
    create.mutate(
      { name, emoji, timeOfDay },
      {
        onSuccess: close,
        onError: () => {
          saving.current = false;
        },
      },
    );
  };

  return (
    <Wallpaper style={styles.container} testID="habits-new-screen">
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          testID="habits-new-scroll">
          <View style={styles.header}>
            <GlassButton
              icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              label="Back"
              onPress={close}
              testID="habits-new-back"
            />
          </View>
          <ThemedText type="title" role="heading" style={styles.title} testID="habits-new-title">
            New habit
          </ThemedText>

          <FormGroup title="Name" testID="habits-new-name-group">
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
                testID="habits-new-name"
              />
            </View>
          </FormGroup>

          <FormGroup title="Emoji" padded testID="habits-new-emoji-group">
            <EmojiGrid
              emojis={habitEmojis}
              value={emoji}
              onChange={setEmoji}
              testID="habits-new-emoji"
            />
          </FormGroup>

          <FormGroup title="Part of the day" padded testID="habits-new-time-group">
            <SegmentedControl
              label="Part of the day"
              options={timeOfDayOptions}
              value={timeOfDay}
              onChange={setTimeOfDay}
              testID="habits-new-time"
            />
          </FormGroup>

          {create.isError && (
            <ThemedText
              type="footnote"
              themeColor="danger"
              role="alert"
              style={styles.inset}
              testID="habits-new-error">
              {"Couldn't save the habit. Try again."}
            </ThemedText>
          )}
          <PrimaryButton
            label="Save"
            onPress={save}
            disabled={!canSave(name) || create.isPending}
            testID="habits-new-save"
          />
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
  header: {
    flexDirection: 'row',
  },
  title: {
    marginHorizontal: Spacing.one,
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
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
