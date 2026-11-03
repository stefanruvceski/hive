import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth } from '@/constants/theme';

import { useArchiveHabit, useHabits, useUpdateHabit } from '../../data/queries';
import { isMeasurable } from '../../domain/goal';
import { scheduleOf } from '../../domain/schedule';
import { TextButton } from '../home/components/text-button';
import { HabitForm } from '../new/components/habit-form';

/** Edit habit: the add form filled with the habit, plus Archive. Saves back to the list. */
export function HabitsEdit({ id }: { id: string }) {
  const habits = useHabits();
  const update = useUpdateHabit();
  const archive = useArchiveHabit();
  const habit = habits.data?.find((item) => item.id === id);
  const schedule = scheduleOf(habit ?? {});

  const archiveHabit = () =>
    archive.mutate(id, {
      onSuccess: () => router.dismissTo('/habits'),
      onError: () =>
        Alert.alert("Couldn't archive", 'The habit was not archived. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: archiveHabit },
        ]),
    });
  const confirmArchive = () =>
    Alert.alert(
      'Archive habit?',
      'It leaves your list. Its history is kept and you can restore it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: archiveHabit },
      ],
    );

  if (!habit) {
    return (
      <Wallpaper style={styles.container} testID="habits-edit-screen">
        <View style={styles.state}>
          {habits.isError && !habits.data ? (
            <ErrorState
              error={habits.error}
              onRetry={() => void habits.refetch()}
              testID="habits-edit-error"
            />
          ) : habits.data ? (
            <ThemedText role="alert" testID="habits-edit-missing">
              This habit no longer exists.
            </ThemedText>
          ) : (
            <LoadingState testID="habits-edit-loading" />
          )}
        </View>
      </Wallpaper>
    );
  }

  return (
    <HabitForm
      testID="habits-edit"
      title="Edit habit"
      initial={{
        name: habit.name,
        emoji: habit.emoji,
        timeOfDay: habit.timeOfDay,
        color: habit.color ?? undefined,
        quit: habit.quit ? true : undefined,
        schedule: schedule.type === 'daily' ? undefined : schedule,
        goal: isMeasurable(habit)
          ? {
              unit: habit.unit ?? '',
              target: habit.target ?? 0,
              aggregation: habit.aggregation,
            }
          : undefined,
      }}
      onSave={(draft, callbacks) => update.mutate({ id, ...draft }, callbacks)}
      isPending={update.isPending}
      isError={update.isError}>
      <TextButton
        label="Archive habit"
        onPress={confirmArchive}
        destructive
        testID="habits-edit-archive"
      />
    </HabitForm>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  state: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
    justifyContent: 'center',
  },
});
