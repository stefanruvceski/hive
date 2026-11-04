import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/error-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';

import { requestReminderPermission } from '../../data/reminder-notifications';
import { useReminderSettings, useSaveReminder } from '../../data/reminder-queries';
import { timeOfDayOptions } from '../../domain/habits';
import { formatTime, type ReminderSetting, shiftTime } from '../../domain/reminders';

const labelOf = (part: ReminderSetting['timeOfDay']) =>
  timeOfDayOptions.find((option) => option.value === part)?.label ?? part;

/** One reminder per part of the day: on or off, and the time it comes at. */
export function HabitsReminders() {
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, error, refetch } = useReminderSettings();
  const saveReminder = useSaveReminder();
  // Set when the user turned a reminder on and notifications are blocked for Hive.
  const [denied, setDenied] = useState(false);

  // Optimistic; a failed write rolls back and offers a retry (07 §2).
  const save = (setting: ReminderSetting) =>
    saveReminder.mutate(setting, {
      onError: () =>
        Alert.alert("Couldn't save", 'Your change was not saved. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => save(setting) },
        ]),
    });

  const toggle = async (setting: ReminderSetting) => {
    if (setting.enabled) {
      setDenied(false);
      return save({ ...setting, enabled: false });
    }
    // Turning one on is what asks for permission.
    if (await requestReminderPermission()) {
      setDenied(false);
      save({ ...setting, enabled: true });
    } else {
      setDenied(true);
    }
  };

  return (
    <Wallpaper style={styles.container} testID="habits-reminders-screen">
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.width}>
          <ScreenHeader
            title="Reminders"
            onBack={() => router.back()}
            backTestID="habits-reminders-back"
            titleTestID="habits-reminders-title"
          />
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.width,
            styles.content,
            { paddingBottom: insets.bottom + Spacing.five },
          ]}
          testID="habits-reminders-scroll">
          <ThemedText themeColor="textSecondary" style={styles.intro}>
            A reminder lists what is still waiting in that part of the day: the habits due and your
            open to-dos. Nothing waiting, no reminder.
          </ThemedText>
          {data ? (
            <>
              {data.map((setting) => (
                <ReminderRow
                  key={setting.timeOfDay}
                  setting={setting}
                  onToggle={() => void toggle(setting)}
                  onShift={(steps) => save({ ...setting, ...shiftTime(setting, steps) })}
                />
              ))}
              {denied && (
                <View style={styles.denied} testID="habits-reminders-denied">
                  <ThemedText themeColor="textSecondary">
                    Notifications are turned off for Hive, so reminders can’t be shown.
                  </ThemedText>
                  <Pressable
                    role="button"
                    onPress={() => void Linking.openSettings()}
                    testID="habits-reminders-open-settings"
                    style={styles.link}>
                    <ThemedText themeColor="accentText">Open Settings</ThemedText>
                  </Pressable>
                </View>
              )}
            </>
          ) : isError ? (
            <ErrorState
              error={error}
              onRetry={() => void refetch()}
              testID="habits-reminders-error"
            />
          ) : (
            isPending && <LoadingState testID="habits-reminders-loading" />
          )}
        </ScrollView>
      </SafeAreaView>
    </Wallpaper>
  );
}

function ReminderRow({
  setting,
  onToggle,
  onShift,
}: {
  setting: ReminderSetting;
  onToggle: () => void;
  onShift: (steps: -1 | 1) => void;
}) {
  const part = setting.timeOfDay;
  const label = labelOf(part);
  return (
    <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="headline">{label}</ThemedText>
        <ToggleSwitch
          value={setting.enabled}
          onValueChange={onToggle}
          label={`${label} reminder`}
          testID={`habits-reminder-${part}-switch`}
        />
      </View>
      {setting.enabled && (
        <View style={styles.row}>
          <ThemedText themeColor="textSecondary">Remind me at</ThemedText>
          <View style={styles.stepper}>
            <StepButton
              glyph="−"
              label={`Earlier ${label} reminder`}
              onPress={() => onShift(-1)}
              testID={`habits-reminder-${part}-earlier`}
            />
            <ThemedText type="headline" testID={`habits-reminder-${part}-time`}>
              {formatTime(setting.hour, setting.minute)}
            </ThemedText>
            <StepButton
              glyph="+"
              label={`Later ${label} reminder`}
              onPress={() => onShift(1)}
              testID={`habits-reminder-${part}-later`}
            />
          </View>
        </View>
      )}
    </GlassSurface>
  );
}

function StepButton({
  glyph,
  label,
  onPress,
  testID,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      testID={testID}
      style={styles.step}>
      <ThemedText type="headline" themeColor="accentText" aria-hidden>
        {glyph}
      </ThemedText>
    </Pressable>
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
  content: { gap: Spacing.three },
  intro: { marginHorizontal: Spacing.one },
  card: { paddingHorizontal: Layout.listRow.paddingHorizontal },
  row: {
    minHeight: Layout.listRow.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Layout.listRow.gap,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  step: {
    minWidth: Layout.minTouchAndroid,
    minHeight: Layout.minTouchAndroid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denied: { gap: Spacing.one, marginHorizontal: Spacing.one },
  link: { minHeight: Layout.minTouchAndroid, justifyContent: 'center' },
});
