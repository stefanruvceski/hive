import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';

import { exportBackupFile, pickBackupText } from '../../data/backup-files';
import { useImportBackup } from '../../data/backup-queries';
import { parseBackup } from '../../domain/backup';

type Status = { kind: 'done' | 'error'; text: string } | null;

/** Habits' data on the phone, as a file: export it, or bring one back. Nothing leaves the phone by itself. */
export function HabitsBackup() {
  const insets = useSafeAreaInsets();
  const importBackup = useImportBackup();
  const [status, setStatus] = useState<Status>(null);

  const exportData = async () => {
    setStatus(null);
    try {
      await exportBackupFile();
    } catch {
      setStatus({ kind: 'error', text: "Couldn't export. Please try again." });
    }
  };

  const replaceWith = (backup: Parameters<typeof importBackup.mutate>[0]) =>
    importBackup.mutate(backup, {
      onSuccess: () =>
        setStatus({ kind: 'done', text: 'Imported. Your Habits data was replaced.' }),
      onError: () => setStatus({ kind: 'error', text: "Couldn't import. Nothing was changed." }),
    });

  const importData = async () => {
    setStatus(null);
    try {
      const text = await pickBackupText();
      if (text === null) return;
      const result = parseBackup(text);
      if (!result.ok) return setStatus({ kind: 'error', text: result.reason });
      Alert.alert(
        'Replace your Habits data?',
        'Everything in Habits is replaced by what is in the file. This can’t be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => replaceWith(result.backup) },
        ],
      );
    } catch {
      setStatus({ kind: 'error', text: "Couldn't read that file." });
    }
  };

  return (
    <Wallpaper style={styles.container} testID="habits-backup-screen">
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.width}>
          <ScreenHeader
            title="Backup"
            onBack={() => router.back()}
            backTestID="habits-backup-back"
            titleTestID="habits-backup-title"
          />
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.width,
            styles.content,
            { paddingBottom: insets.bottom + Spacing.five },
          ]}
          testID="habits-backup-scroll">
          <ThemedText themeColor="textSecondary">
            Your habits, to-dos, mood and reminders live only on this phone. Export them to a file
            to keep a copy or move to a new phone.
          </ThemedText>
          <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.card}>
            <ThemedText type="headline">Export</ThemedText>
            <ThemedText themeColor="textSecondary">
              Saves a file you choose where to put: Files, AirDrop, your drive.
            </ThemedText>
            <PrimaryButton
              label="Export data"
              onPress={() => void exportData()}
              testID="habits-backup-export"
            />
          </GlassSurface>
          <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.card}>
            <ThemedText type="headline">Import</ThemedText>
            <ThemedText themeColor="textSecondary">
              Replaces everything in Habits with a file you exported before.
            </ThemedText>
            <PrimaryButton
              label="Import data"
              disabled={importBackup.isPending}
              onPress={() => void importData()}
              testID="habits-backup-import"
            />
          </GlassSurface>
          {status && (
            <ThemedText
              role="alert"
              themeColor={status.kind === 'error' ? 'danger' : 'textSecondary'}
              testID="habits-backup-status">
              {status.text}
            </ThemedText>
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
  content: { gap: Spacing.three },
  card: { padding: Spacing.three, gap: Spacing.two },
});
