import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Fonts, Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';

import { useMoodEntries, useSaveMood } from '../../data/mood-queries';
import {
  canSaveMood,
  type MoodEntry,
  moodFaces,
  noteLimit,
  recentEntries,
} from '../../domain/mood';
import { FormGroup } from '../new/components/form-group';

const motivationOptions: readonly SegmentedOption<string>[] = ['1', '2', '3', '4', '5'].map(
  (value) => ({ value, label: value }),
);

const faceFor = (mood: number) => moodFaces.find((face) => face.value === mood);

/** Daily mood and motivation: today's entry on top, the last 30 days read-only below. */
export function HabitsMood() {
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, error, refetch } = useMoodEntries();
  const today = useToday();

  return (
    <Wallpaper style={styles.container} testID="habits-mood-screen">
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.headerWrap}>
          <ScreenHeader
            title="Mood"
            onBack={() => router.back()}
            backTestID="habits-mood-back"
            titleTestID="habits-mood-title"
          />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          testID="habits-mood-scroll">
          {isPending ? (
            <LoadingState testID="habits-mood-loading" />
          ) : isError ? (
            <ErrorState error={error} onRetry={refetch} testID="habits-mood-load-error" />
          ) : (
            <>
              {/* Mounted once the entries are loaded: the draft starts from today's entry. */}
              <MoodForm
                key={today}
                today={today}
                entry={data.find((item) => item.date === today)}
              />
              <History entries={recentEntries(data, today)} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Wallpaper>
  );
}

function MoodForm({ today, entry }: { today: string; entry: MoodEntry | undefined }) {
  const theme = useTheme();
  // The draft lives here until Save (07 §7); a failed save keeps it.
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [motivation, setMotivation] = useState<number | null>(entry?.motivation ?? null);
  const [note, setNote] = useState(entry?.note ?? '');
  const save = useSaveMood();

  const submit = () => {
    if (mood === null || motivation === null) return;
    save.mutate({ date: today, mood, motivation, note });
  };

  return (
    <>
      <FormGroup title="How do you feel today?" padded testID="habits-mood-mood-group">
        <View role="radiogroup" aria-label="Mood" style={styles.faces} testID="habits-mood-faces">
          {moodFaces.map((face) => {
            const selected = face.value === mood;
            return (
              <Pressable
                key={face.value}
                role="radio"
                aria-checked={selected}
                aria-label={face.label}
                onPress={() => setMood(face.value)}
                testID={`habits-mood-face-${face.value}`}
                style={[
                  styles.face,
                  selected && [
                    styles.selected,
                    {
                      backgroundColor: theme.segmentSelected,
                      borderColor: theme.segmentSelectedBorder,
                    },
                  ],
                ]}>
                <ThemedText aria-hidden>{face.emoji}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </FormGroup>

      <FormGroup title="Motivation" padded testID="habits-mood-motivation-group">
        <SegmentedControl
          label="Motivation"
          options={motivationOptions}
          value={motivation === null ? '' : String(motivation)}
          onChange={(value) => setMotivation(Number(value))}
          testID="habits-mood-motivation"
        />
      </FormGroup>

      <FormGroup title="Note" testID="habits-mood-note-group">
        <View style={styles.noteRow}>
          {/* RN TextInput: @expo/ui's TextInput has no Jest implementation (checkpoint B). */}
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional"
            placeholderTextColor={theme.textQuaternary}
            selectionColor={theme.accent}
            cursorColor={theme.accent}
            aria-label="Note"
            maxLength={noteLimit}
            multiline
            style={[styles.input, { color: theme.text }]}
            testID="habits-mood-note"
          />
        </View>
      </FormGroup>

      {save.isError && (
        <ThemedText
          type="footnote"
          themeColor="danger"
          role="alert"
          style={styles.inset}
          testID="habits-mood-error">
          {"Couldn't save. Try again."}
        </ThemedText>
      )}
      <PrimaryButton
        label="Save"
        onPress={submit}
        disabled={!canSaveMood({ mood, motivation }) || save.isPending}
        testID="habits-mood-save"
      />
    </>
  );
}

function History({ entries }: { entries: MoodEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <FormGroup title="Last 30 days" testID="habits-mood-history">
      {entries.map((item) => (
        <View
          key={item.date}
          accessible
          style={styles.historyRow}
          testID={`habits-mood-history-${item.date}`}>
          <ThemedText type="row">{item.date}</ThemedText>
          <ThemedText type="row">
            {faceFor(item.mood)?.emoji} · {item.motivation}/5
          </ThemedText>
          {item.note !== null && <ThemedText type="footnote">{item.note}</ThemedText>}
        </View>
      ))}
    </FormGroup>
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
  faces: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  face: {
    minWidth: Layout.minTouch,
    minHeight: Layout.minTouch,
    borderRadius: Layout.listRow.icon.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 1,
  },
  noteRow: {
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    justifyContent: 'center',
  },
  // ThemedText's `row` type (17, system font); a TextInput can't use ThemedText.
  input: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    paddingVertical: Spacing.two,
  },
  inset: {
    marginHorizontal: Layout.listRow.paddingHorizontal,
  },
  historyRow: {
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
