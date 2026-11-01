import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { HabitRow } from './habit-row';
import type { Habit } from '../../../data/queries';
import type { TimeOfDay } from '../../../data/schema';
import { currentStreak } from '../../../domain/streak';

type Props = {
  timeOfDay: TimeOfDay;
  label: string;
  habits: Habit[];
  /** Each habit's done dates (`doneDatesByHabit`). */
  doneDates: ReadonlyMap<string, ReadonlySet<string>>;
  today: string;
  onToggle: (habitId: string, done: boolean) => void;
};

const none: ReadonlySet<string> = new Set();

/** A part of the day and its habits: a header over a glass list, as the Settings list groups. */
export function HabitSection({ timeOfDay, label, habits, doneDates, today, onToggle }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.section} testID={`habits-section-${timeOfDay}`}>
      <ThemedText type="listHeader" role="heading" style={styles.inset}>
        {label}
      </ThemedText>
      <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.list}>
        {habits.map((habit, index) => (
          <Fragment key={habit.id}>
            {index > 0 && <View style={[styles.separator, { backgroundColor: theme.separator }]} />}
            <HabitRow
              habit={habit}
              doneToday={(doneDates.get(habit.id) ?? none).has(today)}
              streak={currentStreak(doneDates.get(habit.id) ?? none, today)}
              onToggle={(done) => onToggle(habit.id, done)}
            />
          </Fragment>
        ))}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  inset: {
    marginHorizontal: Layout.listRow.paddingHorizontal,
  },
  list: {
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginStart: Layout.listRow.paddingHorizontal,
  },
});
