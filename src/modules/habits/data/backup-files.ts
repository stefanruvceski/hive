// The only place that talks to expo-file-system and expo-sharing: writing the backup file out
// through the share sheet, and reading one the user picks. domain/backup.ts checks what it holds.
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { readBackup } from './backup-queries';
import { backupFileName } from '../domain/backup';

/** Writes the backup to a file and opens the share sheet (Save to Files, AirDrop, Drive…). */
export async function exportBackupFile(now = new Date()): Promise<void> {
  const file = new File(Paths.cache, backupFileName(now));
  file.create({ overwrite: true });
  await file.write(JSON.stringify(readBackup(now)));
  await shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

/** Lets the user pick a file and returns its text; null when they cancel. */
export async function pickBackupText(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain'] });
  return picked.canceled ? null : picked.result.text();
}
