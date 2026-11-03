import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

import { HabitSection } from './components/habit-section';
import { TextButton } from './components/text-button';
import {
  type CompletionChange,
  useArchivedHabits,
  useArchiveHabit,
  useCompletions,
  useHabits,
  useMoveHabit,
  useSetCompletion,
} from '../../data/queries';
import { groupByTimeOfDay } from '../../domain/habits';
import type { Direction } from '../../domain/order';
import { doneDatesByHabit } from '../../domain/streak';
import type { SwipeSide } from '../../domain/swipe';

const addHabit = () => router.push('/habits/new');
const openMood = () => router.push('/habits/mood');
const editHabit = (id: string) => router.push({ pathname: '/habits/[id]', params: { id } });
const openArchived = () => router.push('/habits/archived');

/** Habits' entry screen: the habits grouped by part of the day. Header as in Settings. */
export function HabitsHome() {
  const [reordering, setReordering] = useState(false);
  const habits = useHabits();
  const hasHabits = (habits.data?.length ?? 0) > 0;

  return (
    <Wallpaper style={styles.container} testID="habits-screen">
      {/* No bottom edge: the list scrolls to the screen edge and clears the home indicator with
          padding instead (review-lessons L-004). */}
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={[styles.header, styles.width]}>
          <GlassButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            label="Back"
            onPress={() => router.back()}
            testID="habits-back"
          />
          <View style={styles.actions}>
            {reordering ? (
              <PrimaryButton
                label="Done"
                size="compact"
                onPress={() => setReordering(false)}
                testID="habits-reorder-done"
              />
            ) : (
              <>
                {hasHabits && (
                  <GlassButton
                    icon={{ ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' }}
                    label="Reorder habits"
                    onPress={() => setReordering(true)}
                    testID="habits-reorder-toggle"
                  />
                )}
                <GlassButton
                  icon={{ ios: 'face.smiling', android: 'mood', web: 'mood' }}
                  label="Mood"
                  onPress={openMood}
                  testID="habits-mood-open"
                />
                <GlassButton
                  icon={{ ios: 'plus', android: 'add', web: 'add' }}
                  label="Add habit"
                  onPress={addHabit}
                  testID="habits-add"
                />
              </>
            )}
          </View>
        </View>
        <HabitsContent reordering={reordering} />
      </SafeAreaView>
    </Wallpaper>
  );
}

function Title() {
  return (
    <ThemedText type="title" role="heading" style={styles.title} testID="habits-title">
      Habits
    </ThemedText>
  );
}

// Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3). The list
// needs both the habits and the days they were done.
function HabitsContent({ reordering }: { reordering: boolean }) {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const habits = useHabits();
  const completions = useCompletions();
  const setCompletion = useSetCompletion();
  const move = useMoveHabit();
  const archive = useArchiveHabit();
  // One row shows its swipe buttons at a time.
  const [open, setOpen] = useState<{ habitId: string; side: SwipeSide } | null>(null);
  const archived = useArchivedHabits();
  const hasArchived = (archived.data?.length ?? 0) > 0;

  // Optimistic: the check flips at once and rolls back on failure, then offers a retry (07 §2).
  const save = (change: CompletionChange) =>
    setCompletion.mutate(change, {
      onError: () =>
        Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => save(change) },
        ]),
    });

  const moveHabit = (id: string, direction: Direction) =>
    move.mutate(
      { id, direction },
      {
        onError: () =>
          Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try again', onPress: () => moveHabit(id, direction) },
          ]),
      },
    );

  const archiveHabit = (id: string) =>
    archive.mutate(id, {
      onError: () =>
        Alert.alert("Couldn't archive", 'The habit was not archived. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => archiveHabit(id) },
        ]),
    });

  const archivedLink = hasArchived && (
    <TextButton label="Archived habits" onPress={openArchived} testID="habits-archived-link" />
  );

  const data = habits.data && completions.data ? habits.data : undefined;
  const error = habits.error ?? completions.error;
  const isError = !data && (habits.isError || completions.isError);
  const refetch = () => {
    void habits.refetch();
    void completions.refetch();
  };

  if (data && data.length > 0) {
    const doneDates = doneDatesByHabit(completions.data ?? []);
    return (
      <ScrollView
        contentContainerStyle={[
          styles.width,
          styles.list,
          { paddingBottom: insets.bottom + Spacing.five },
        ]}
        testID="habits-list">
        <Title />
        {groupByTimeOfDay(data).map((group) => (
          <HabitSection
            key={group.timeOfDay}
            {...group}
            doneDates={doneDates}
            today={today}
            onToggle={(habitId, done) => save({ habitId, date: today, done })}
            onMove={reordering ? moveHabit : undefined}
            onEdit={editHabit}
            onArchive={archiveHabit}
            open={open}
            onOpenChange={(habitId, side) => setOpen(side ? { habitId, side } : null)}
          />
        ))}
        {archivedLink}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, styles.width, { paddingBottom: insets.bottom }]}>
      <Title />
      {data ? (
        <>
          <EmptyState
            title="No habits yet"
            description="Add the first thing you want to do every day."
            action={
              <PrimaryButton label="Add habit" onPress={addHabit} testID="habits-empty-add" />
            }
            testID="habits-empty"
          />
          {archivedLink}
        </>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} testID="habits-error" />
      ) : (
        <LoadingState testID="habits-loading" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  width: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  title: {
    marginHorizontal: Spacing.one,
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
});
