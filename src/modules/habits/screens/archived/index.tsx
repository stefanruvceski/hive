import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SwipeRow } from '@/components/ui/swipe-row';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type SwipeSide } from '@/utils/swipe';

import { type Habit, useArchivedHabits, useDeleteHabit, useRestoreHabit } from '../../data/queries';

const retryAlert = (title: string, retry: () => void) =>
  Alert.alert(title, 'Your change was not saved. Please try again.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Try again', onPress: retry },
  ]);

/** Archived habits: swipe to restore one to the end of its part of the day, or to delete it for good. */
export function HabitsArchived() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const archived = useArchivedHabits();
  const restore = useRestoreHabit();
  const remove = useDeleteHabit();
  const [open, setOpen] = useState<{ id: string; side: SwipeSide } | null>(null);

  const restoreHabit = (id: string) =>
    restore.mutate(id, { onError: () => retryAlert("Couldn't restore", () => restoreHabit(id)) });
  const deleteHabit = (id: string) =>
    remove.mutate(id, { onError: () => retryAlert("Couldn't delete", () => deleteHabit(id)) });
  const confirmDelete = (habit: Habit) =>
    Alert.alert(
      'Delete permanently?',
      `"${habit.name}" and its history (every day you marked it done) will be deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
      ],
    );

  const habits = archived.data;

  return (
    <Wallpaper style={styles.container} testID="habits-archived-screen">
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.width}>
          <ScreenHeader
            title="Archived habits"
            onBack={() => router.back()}
            backTestID="habits-archived-back"
            titleTestID="habits-archived-title"
          />
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.width,
            styles.list,
            { paddingBottom: insets.bottom + Spacing.five },
          ]}
          testID="habits-archived-list">
          {habits && habits.length > 0 ? (
            <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.card}>
              {habits.map((habit, index) => (
                <Fragment key={habit.id}>
                  {index > 0 && (
                    <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                  )}
                  <SwipeRow
                    open={open?.id === habit.id ? open.side : null}
                    onOpenChange={(side) => setOpen(side ? { id: habit.id, side } : null)}
                    onEdit={() => restoreHabit(habit.id)}
                    onArchive={() => confirmDelete(habit)}
                    editLabel="Restore"
                    editIcon={{ ios: 'arrow.uturn.backward', android: 'restore', web: 'restore' }}
                    archiveLabel="Delete"
                    enabled
                    name={habit.name}
                    testID={`habits-archived-swipe-${habit.id}`}>
                    <View style={styles.name} testID={`habits-archived-item-${habit.id}`}>
                      <ThemedText aria-hidden>{habit.emoji}</ThemedText>
                      <ThemedText style={styles.grow}>{habit.name}</ThemedText>
                    </View>
                  </SwipeRow>
                </Fragment>
              ))}
            </GlassSurface>
          ) : habits ? (
            <EmptyState
              title="Nothing archived"
              description="Habits you archive show up here."
              testID="habits-archived-empty"
            />
          ) : archived.isError ? (
            <ErrorState
              error={archived.error}
              onRetry={() => void archived.refetch()}
              testID="habits-archived-error"
            />
          ) : (
            <LoadingState testID="habits-archived-loading" />
          )}
        </ScrollView>
      </SafeAreaView>
    </Wallpaper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  width: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
  },
  list: { gap: Spacing.two },
  card: { overflow: 'hidden' },
  name: {
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    paddingTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
  },
  grow: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginStart: Layout.listRow.paddingHorizontal },
});
