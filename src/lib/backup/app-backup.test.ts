import { homeApps, homeGroups } from '@/lib/db/schema';

import {
  appBackupFileName,
  buildAppBackup,
  latestAppBackupName,
  parseAppBackup,
} from './app-backup';

const app = {
  moduleId: 'habits',
  groupId: 'body-mind',
  position: 0,
  pinnedPosition: null,
  hidden: false,
};
const group = { id: 'g1', name: 'Mine', position: 0 };
const tables = [homeGroups, homeApps] as const;
const file = (rows: Record<string, unknown[]>, extra: object = {}) =>
  JSON.stringify({ app: 'hive-backup', version: 1, exportedAt: 'x', tables: rows, ...extra });

describe('parseAppBackup', () => {
  it('reads what buildAppBackup wrote', () => {
    const built = buildAppBackup(
      {
        home_apps: [app],
        home_groups: [group],
      },
      new Date('2026-11-05T10:00:00Z'),
    );
    const result = parseAppBackup(JSON.stringify(built), tables);
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.backup.tables.home_apps).toEqual([app]);
  });

  it('treats a table the file lacks as empty', () => {
    const result = parseAppBackup(file({ home_apps: [app] }), tables);
    expect(result.ok && result.backup.tables.home_groups).toEqual([]);
  });

  it('refuses text that is not a Hive backup', () => {
    for (const text of ['nope', '[]', JSON.stringify({ app: 'hive-habits', version: 1 })]) {
      expect(parseAppBackup(text, tables)).toEqual({
        ok: false,
        reason: 'This file is not a Hive backup.',
      });
    }
  });

  it('refuses a backup from a newer app', () => {
    expect(parseAppBackup(file({}, { version: 99 }), tables)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('newer version'),
    });
  });

  it('refuses a row with a wrong kind, a bad enum value, a missing column or a stray one', () => {
    const bad = [
      { ...app, position: '0' },
      { ...app, hidden: 'no' },
      { ...app, groupId: undefined },
      { ...app, extra: 1 },
    ];
    for (const row of bad) {
      expect(parseAppBackup(file({ home_apps: [row] }), tables)).toMatchObject({
        ok: false,
        reason: 'This backup is damaged and was not imported.',
      });
    }
  });

  it('lets a column with a default be left out', () => {
    const { hidden: _h, pinnedPosition: _p, ...rest } = app;
    expect(parseAppBackup(file({ home_apps: [rest] }), tables)).toMatchObject({ ok: true });
  });
});

describe('backup file names', () => {
  it('names a backup by its day', () => {
    expect(appBackupFileName(new Date(2026, 10, 5))).toBe('hive-backup-2026-11-05.json');
  });

  it('finds the newest of ours in a folder', () => {
    expect(
      latestAppBackupName([
        'notes.txt',
        'hive-backup-2026-11-03.json',
        'hive-backup-2026-11-05.json',
        'hive-habits-2026-12-01.json',
      ]),
    ).toBe('hive-backup-2026-11-05.json');
    expect(latestAppBackupName(['notes.txt'])).toBeNull();
  });
});
