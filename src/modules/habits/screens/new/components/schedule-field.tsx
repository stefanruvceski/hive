import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { type Schedule, scheduleTypes, weekdayLabels } from '../../../domain/schedule';

type Props = {
  value: Schedule;
  onChange: (schedule: Schedule) => void;
  /** On the field; the choice is `${testID}-type`, a weekday `${testID}-day-1` … 7. */
  testID: string;
};

const weekdayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const workweek = [1, 2, 3, 4, 5];

/** How often a habit is due: every day, on chosen weekdays, or a number of days a week. */
export function ScheduleField({ value, onChange, testID }: Props) {
  const theme = useTheme();

  const toggleDay = (day: number) =>
    onChange({
      ...value,
      days: value.days.includes(day)
        ? value.days.filter((chosen) => chosen !== day)
        : [...value.days, day].sort((a, b) => a - b),
    });
  const setTimes = (times: number) => onChange({ ...value, times });

  return (
    <View style={styles.field}>
      <SegmentedControl
        label="Schedule"
        options={scheduleTypes}
        value={value.type}
        onChange={(type) =>
          onChange({
            type,
            days: type === 'weekdays' ? (value.days.length > 0 ? value.days : workweek) : [],
            times: value.times,
          })
        }
        testID={`${testID}-type`}
      />
      {value.type === 'weekdays' && (
        <View style={styles.days} testID={`${testID}-days`}>
          {weekdayLabels.map((label, index) => {
            const day = index + 1;
            const chosen = value.days.includes(day);
            return (
              <Pressable
                key={day}
                role="checkbox"
                aria-checked={chosen}
                aria-label={weekdayNames[index]}
                onPress={() => toggleDay(day)}
                testID={`${testID}-day-${day}`}
                style={[
                  styles.day,
                  chosen
                    ? {
                        backgroundColor: theme.segmentSelected,
                        borderColor: theme.segmentSelectedBorder,
                      }
                    : { backgroundColor: theme.control, borderColor: theme.controlBorder },
                ]}>
                <ThemedText type="footnote" aria-hidden>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}
      {value.type === 'weekly' && (
        <View style={styles.times}>
          <StepButton
            label="Fewer times"
            testID={`${testID}-fewer`}
            glyph="−"
            disabled={value.times <= 1}
            onPress={() => setTimes(value.times - 1)}
          />
          <ThemedText testID={`${testID}-times`}>
            {value.times} {value.times === 1 ? 'time' : 'times'} a week
          </ThemedText>
          <StepButton
            label="More times"
            testID={`${testID}-more`}
            glyph="+"
            disabled={value.times >= 7}
            onPress={() => setTimes(value.times + 1)}
          />
        </View>
      )}
    </View>
  );
}

function StepButton({
  label,
  glyph,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  testID: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.step,
        { backgroundColor: theme.control, borderColor: theme.controlBorder },
        disabled && styles.disabled,
      ]}>
      <ThemedText type="headline" aria-hidden>
        {glyph}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.three,
  },
  days: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  day: {
    flex: 1,
    minHeight: Layout.minTouch,
    borderRadius: Layout.listRow.icon.radius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  step: {
    width: Layout.minTouch,
    height: Layout.minTouch,
    borderRadius: Layout.minTouch / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
});
