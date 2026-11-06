// The only place in Settings that talks to expo-file-system and expo-sharing: where the all-apps
// backup is written, found again and read. lib/backup/app-backup.ts checks what a file holds.
import { Directory, File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { appBackupFileName, latestAppBackupName } from '@/lib/backup/app-backup';

const mimeType = 'application/json';

/** Lets the user choose the backup folder; null when they cancel. */
export async function pickBackupFolder(): Promise<{ uri: string; name: string } | null> {
  try {
    const folder = await Directory.pickDirectoryAsync();
    return { uri: folder.uri, name: folder.name };
  } catch {
    return null;
  }
}

/** Writes today's backup into the folder, replacing one made earlier the same day. */
export async function writeBackupToFolder(
  folderUri: string,
  text: string,
  now: Date,
): Promise<void> {
  const folder = new Directory(folderUri);
  const name = appBackupFileName(now);
  for (const entry of folder.list())
    if (entry instanceof File && entry.name === name) entry.delete();
  const file = folder.createFile(name, mimeType);
  await file.write(text);
}

/** The text of the newest backup in the folder; null when it has none. */
export async function readLatestFromFolder(folderUri: string): Promise<string | null> {
  const files = new Directory(folderUri)
    .list()
    .filter((entry): entry is File => entry instanceof File);
  const name = latestAppBackupName(files.map((file) => file.name));
  return name === null ? null : (files.find((file) => file.name === name)?.text() ?? null);
}

/** Lets the user pick a file and returns its text; null when they cancel. */
export async function pickBackupText(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: [mimeType, 'text/plain'] });
  return picked.canceled ? null : picked.result.text();
}

/** Writes the backup to a temporary file and opens the share sheet (Files, AirDrop, Drive…). */
export async function shareBackup(text: string, now: Date): Promise<void> {
  const file = new File(Paths.cache, appBackupFileName(now));
  file.create({ overwrite: true });
  await file.write(text);
  await shareAsync(file.uri, { mimeType, UTI: 'public.json' });
}
