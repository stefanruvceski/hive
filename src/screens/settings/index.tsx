import { Host, Switch } from '@expo/ui';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/error-state';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadingState } from '@/components/ui/loading-state';
import { type SegmentedOption, SegmentedControl } from '@/components/ui/segmented-control';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppSettings, useSetAppSetting } from '@/hooks/use-app-settings';
import { useTheme } from '@/hooks/use-theme';
import { type Appearance, type DateFormat, formatDateExample } from '@/utils/app-settings';

import { AppInfoCard } from './components/app-info-card';
import { SettingsGroup } from './components/settings-group';
import { SettingsRow } from './components/settings-row';

const appearanceOptions: SegmentedOption<Appearance>[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const dateFormatOptions: SegmentedOption<DateFormat>[] = [
  { value: 'eu', label: 'Europe' },
  { value: 'iso', label: 'ISO' },
  { value: 'us', label: 'US' },
];

/** Settings from docs/design/canvas/Settings.dc.html: preferences, backup (not yet live), about. */
export function Settings() {
  return (
    <Wallpaper style={styles.container}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <GlassButton
              icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              label="Back"
              onPress={() => router.back()}
              testID="settings-back"
            />
          </View>
          <ThemedText type="title" role="heading" style={styles.title} testID="settings-title">
            Settings
          </ThemedText>
          <Preferences />
          <BackupGroup />
          <AppInfoCard />
        </ScrollView>
      </SafeAreaView>
    </Wallpaper>
  );
}

// Four states, data first (07 §1). Settings are local, so "error" means the database failed.
function Preferences() {
  const { data, error, isPending, isError, refetch } = useAppSettings();
  const save = useSetAppSetting();
  const theme = useTheme();

  if (isPending) return <LoadingState testID="settings-loading" />;
  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} testID="settings-error" />;
  }

  return (
    <>
      <SettingsGroup
        title="Home"
        footnote="Today shows a short summary from each app at the top of Home."
        testID="settings-home">
        <SettingsRow
          label="Show Today"
          icon={{ ios: 'rectangle.grid.1x2', android: 'widgets', web: 'widgets' }}
          trailing={
            <Host matchContents seedColor={theme.accent}>
              <Switch
                value={data.showToday}
                onValueChange={(value) => save.mutate({ key: 'showToday', value })}
                label="Show Today"
                testID="settings-show-today"
              />
            </Host>
          }
          testID="settings-show-today-row"
        />
      </SettingsGroup>

      <SettingsGroup
        title="Appearance"
        footnote="System follows your phone's light or dark setting."
        padded
        testID="settings-appearance-group">
        <SegmentedControl
          label="Appearance"
          options={appearanceOptions}
          value={data.appearance}
          onChange={(value) => save.mutate({ key: 'appearance', value })}
          testID="settings-appearance"
        />
      </SettingsGroup>

      <SettingsGroup
        title="Date Format"
        footnote={`Dates look like ${formatDateExample(data.dateFormat, new Date())} in every app in Hive.`}
        padded
        testID="settings-date-format-group">
        <SegmentedControl
          label="Date format"
          options={dateFormatOptions}
          value={data.dateFormat}
          onChange={(value) => save.mutate({ key: 'dateFormat', value })}
          testID="settings-date-format"
        />
      </SettingsGroup>

      {save.isError && (
        <ThemedText
          type="footnote"
          themeColor="danger"
          style={styles.inset}
          testID="settings-save-error">
          {"Couldn't save that change. Try again."}
        </ThemedText>
      )}
    </>
  );
}

/** Backup is designed but not built yet: shown, dimmed and inert until the backup story. */
function BackupGroup() {
  return (
    <SettingsGroup
      title="Backup"
      footnote="Every app in one file, saved once a day to a folder on your phone: two weeks of daily copies and one per month. The folder stays if Hive is deleted. Keys and sign-ins are never in it."
      testID="settings-backup">
      <SettingsRow label="Back Up Now" action disabled testID="settings-backup-now" />
      <SettingsRow label="Folder" value="Not set up" disabled testID="settings-backup-folder" />
      <SettingsRow label="Last Backup" value="Never" disabled testID="settings-backup-last" />
      <SettingsRow label="Restore Latest Backup" action disabled testID="settings-restore-latest" />
      <SettingsRow label="Restore from File…" action disabled testID="settings-restore-file" />
      <SettingsRow label="Share Backup…" action disabled testID="settings-backup-share" />
    </SettingsGroup>
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
    paddingBottom: Spacing.five,
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
  inset: {
    marginHorizontal: Layout.listRow.paddingHorizontal,
  },
});
