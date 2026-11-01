import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';

import { HabitSection } from './components/habit-section';
import { useHabits } from '../../data/queries';
import { groupByTimeOfDay } from '../../domain/habits';

const addHabit = () => router.push('/habits/new');

/** Habits' entry screen: the habits grouped by part of the day. Header as in Settings. */
export function HabitsHome() {
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
          <GlassButton
            icon={{ ios: 'plus', android: 'add', web: 'add' }}
            label="Add habit"
            onPress={addHabit}
            testID="habits-add"
          />
        </View>
        <HabitsContent />
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

// Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3).
function HabitsContent() {
  const insets = useSafeAreaInsets();
  const { data, error, isError, refetch } = useHabits();

  if (data && data.length > 0) {
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
          <HabitSection key={group.timeOfDay} {...group} />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, styles.width, { paddingBottom: insets.bottom }]}>
      <Title />
      {data ? (
        <EmptyState
          title="No habits yet"
          description="Add the first thing you want to do every day."
          action={<PrimaryButton label="Add habit" onPress={addHabit} testID="habits-empty-add" />}
          testID="habits-empty"
        />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} testID="habits-error" />
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
  list: {
    gap: Spacing.two,
  },
  title: {
    marginHorizontal: Spacing.one,
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
});
