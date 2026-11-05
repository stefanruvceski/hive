import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { type SegmentedOption, SegmentedControl } from '@/components/ui/segmented-control';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppSettings, useSetAppSetting } from '@/hooks/use-app-settings';
import { type Appearance, type DateFormat, formatDateExample } from '@/utils/app-settings';

import { AppInfoCard } from './components/app-info-card';
import { SettingsGroup } from './components/settings-group';
import { SettingsRow } from './components/settings-row';
import { useBackup } from './use-backup';

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

/** Settings from docs/design/canvas/Settings.dc.html: preferences, backup and restore, about. */
export function Settings() {
  const insets = useSafeAreaInsets();

  return (
    <Wallpaper style={styles.container}>
      {/* No bottom edge: the list scrolls to the screen edge and clears the home indicator with
          padding, instead of being cut off above it. */}
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.headerWrap}>
          <ScreenHeader
            title="Settings"
            onBack={() => router.back()}
            backTestID="settings-back"
            titleTestID="settings-title"
          />
        </View>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          testID="settings-scroll">
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
            <ToggleSwitch
              value={data.showToday}
              onValueChange={(value) => save.mutate({ key: 'showToday', value })}
              label="Show Today"
              testID="settings-show-today"
            />
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

/** The folder's name from its URI: `file:///…/Backups/` → `Backups`. */
const folderName = (uri: string) =>
  decodeURIComponent(uri.replace(/\/+$/, '').split(/[/:]/).pop() ?? '') || 'Chosen';

const lastBackupText = (iso: string | null, format: DateFormat) => {
  const at = iso === null ? null : new Date(iso);
  if (at === null || Number.isNaN(at.getTime())) return 'Never';
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  return `${formatDateExample(format, at)} ${time}`;
};

/** Backup and restore of every app as one file, to a folder the user chose or through the share sheet. */
function BackupGroup() {
  const { data } = useAppSettings();
  const backup = useBackup(data?.backupFolder ?? null);
  const disabled = backup.busy;

  return (
    <SettingsGroup
      title="Backup"
      footnote="Every app in one file. Back up when you like: to the folder you choose (it stays if Hive is deleted) or to anywhere through Share. Keys and sign-ins are never in it."
      testID="settings-backup">
      <SettingsRow
        label="Back Up Now"
        action
        disabled={disabled}
        onPress={() => void backup.backUpNow()}
        testID="settings-backup-now"
      />
      <SettingsRow
        label="Folder"
        value={data?.backupFolder ? folderName(data.backupFolder) : 'Not set up'}
        disabled={disabled}
        onPress={() => void backup.chooseFolder()}
        testID="settings-backup-folder"
      />
      <SettingsRow
        label="Last Backup"
        value={lastBackupText(data?.lastBackup ?? null, data?.dateFormat ?? 'eu')}
        testID="settings-backup-last"
      />
      <SettingsRow
        label="Restore Latest Backup"
        action
        disabled={disabled}
        onPress={() => void backup.restoreLatest()}
        testID="settings-restore-latest"
      />
      <SettingsRow
        label="Restore from File…"
        action
        disabled={disabled}
        onPress={() => void backup.restoreFromFile()}
        testID="settings-restore-file"
      />
      <SettingsRow
        label="Share Backup…"
        action
        disabled={disabled}
        onPress={() => void backup.share()}
        testID="settings-backup-share"
      />
      {backup.status && (
        <ThemedText
          role="alert"
          type="footnote"
          themeColor={backup.status.kind === 'error' ? 'danger' : 'textSecondary'}
          style={styles.inset}
          testID="settings-backup-status">
          {backup.status.text}
        </ThemedText>
      )}
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
    gap: Spacing.two,
  },
  headerWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
  },
  inset: {
    marginHorizontal: Layout.listRow.paddingHorizontal,
  },
});
