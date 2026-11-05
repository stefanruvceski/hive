import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useSetAppSetting } from '@/hooks/use-app-settings';
import { parseAppBackup } from '@/lib/backup/app-backup';
import { readAppBackup, replaceFromBackup } from '@/lib/backup/db';
import { backupTables } from '@/modules/backup-tables';

import {
  pickBackupFolder,
  pickBackupText,
  readLatestFromFolder,
  shareBackup,
  writeBackupToFolder,
} from './backup-files';

export type BackupStatus = { kind: 'done' | 'error'; text: string } | null;

/**
 * What the Backup rows do. Nothing leaves the phone by itself: a backup is written to the folder the
 * user chose, or handed to the share sheet; a restore replaces the apps' data after a confirmation.
 */
export function useBackup(folder: string | null) {
  const queryClient = useQueryClient();
  const save = useSetAppSetting();
  const [status, setStatus] = useState<BackupStatus>(null);
  const [busy, setBusy] = useState(false);

  const done = (text: string) => setStatus({ kind: 'done', text });
  const fail = (text: string) => setStatus({ kind: 'error', text });
  const stamp = (now: Date) => save.mutate({ key: 'lastBackup', value: now.toISOString() });

  const chooseFolder = async () => {
    setStatus(null);
    const picked = await pickBackupFolder();
    if (picked) save.mutate({ key: 'backupFolder', value: picked.uri });
    return picked?.uri ?? null;
  };

  const backUpNow = async () => {
    setStatus(null);
    const target = folder ?? (await chooseFolder());
    if (target === null) return;
    setBusy(true);
    try {
      const now = new Date();
      await writeBackupToFolder(target, JSON.stringify(readAppBackup(backupTables, now)), now);
      stamp(now);
      done('Backed up to your folder.');
    } catch {
      fail("Couldn't write to the folder. Choose it again.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setStatus(null);
    setBusy(true);
    try {
      const now = new Date();
      await shareBackup(JSON.stringify(readAppBackup(backupTables, now)), now);
      stamp(now);
    } catch {
      fail("Couldn't share the backup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const replaceWith = (text: string) => {
    const result = parseAppBackup(text, backupTables);
    if (!result.ok) return fail(result.reason);
    Alert.alert(
      'Replace everything in Hive?',
      'Habits, Money and Wallet are replaced by what is in the backup. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => {
            try {
              replaceFromBackup(backupTables, result.backup);
              void queryClient.invalidateQueries();
              done('Restored. Your apps now hold the backup’s data.');
            } catch {
              fail("Couldn't restore. Nothing was changed.");
            }
          },
        },
      ],
    );
  };

  const restoreFromFile = async () => {
    setStatus(null);
    try {
      const text = await pickBackupText();
      if (text !== null) replaceWith(text);
    } catch {
      fail("Couldn't read that file.");
    }
  };

  const restoreLatest = async () => {
    setStatus(null);
    if (folder === null) return fail('Choose a backup folder first.');
    try {
      const text = await readLatestFromFolder(folder);
      if (text === null) return fail('There is no backup in that folder yet.');
      replaceWith(text);
    } catch {
      fail("Couldn't open the folder. Choose it again.");
    }
  };

  return { status, busy, chooseFolder, backUpNow, share, restoreFromFile, restoreLatest };
}
