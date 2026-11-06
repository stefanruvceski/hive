// The all-apps backup file: every table the shell lists, as rows. Pure — the tables are described
// by their Drizzle definitions, so a column added to a schema is in the next backup by itself.
// Built and read by ./db.ts, tested in app-backup.test.ts.

import { getTableColumns, getTableName, type Table } from 'drizzle-orm';

export const appBackupApp = 'hive-backup';
/** Bumped when the file's shape changes; a newer file is refused by an older app. */
export const appBackupVersion = 1;

type Row = Record<string, unknown>;

export type AppBackup = {
  app: typeof appBackupApp;
  version: number;
  exportedAt: string;
  /** Rows by table name (`habits_habits`). Column keys are the Drizzle property names. */
  tables: Record<string, Row[]>;
};

export type AppBackupResult = { ok: true; backup: AppBackup } | { ok: false; reason: string };

const isRecord = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const damaged = { ok: false, reason: 'This backup is damaged and was not imported.' } as const;

function fitsColumn(
  value: unknown,
  column: { dataType: string; notNull: boolean; enumValues?: readonly string[] },
): boolean {
  if (value === null || value === undefined) return !column.notNull;
  if (column.enumValues && column.enumValues.length > 0) {
    return typeof value === 'string' && column.enumValues.includes(value);
  }
  if (column.dataType === 'boolean') return typeof value === 'boolean';
  if (column.dataType === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (column.dataType === 'string') return typeof value === 'string';
  return false;
}

/** Whether `row` has every column of `table` with a value of the right kind (and nothing else). */
function fitsTable(row: unknown, table: Table): row is Row {
  if (!isRecord(row)) return false;
  const columns = getTableColumns(table);
  const keys = Object.keys(columns);
  return (
    Object.keys(row).every((key) => key in columns) &&
    keys.every((key) => {
      const column = columns[key];
      // A column the file leaves out is fine when the table has a default or allows null.
      return (
        column !== undefined &&
        (key in row ? fitsColumn(row[key], column) : !column.notNull || column.hasDefault)
      );
    })
  );
}

/** Writes the tables' rows out as one file. `rows` is keyed by table name. */
export function buildAppBackup(rows: Record<string, Row[]>, now: Date): AppBackup {
  return {
    app: appBackupApp,
    version: appBackupVersion,
    exportedAt: now.toISOString(),
    tables: rows,
  };
}

/**
 * Reads a backup file's text against the tables this app has. Anything that is not a whole, current
 * backup is refused before a single row is replaced. A table the file lacks is left empty.
 */
export function parseAppBackup(text: string, tables: readonly Table[]): AppBackupResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'This file is not a Hive backup.' };
  }
  if (!isRecord(data) || data.app !== appBackupApp || typeof data.version !== 'number') {
    return { ok: false, reason: 'This file is not a Hive backup.' };
  }
  if (data.version > appBackupVersion) {
    return {
      ok: false,
      reason: 'This backup is from a newer version of Hive. Update the app first.',
    };
  }
  if (!isRecord(data.tables)) return damaged;
  const checked: Record<string, Row[]> = {};
  for (const table of tables) {
    const name = getTableName(table);
    const rows = data.tables[name] ?? [];
    if (!Array.isArray(rows) || !rows.every((row) => fitsTable(row, table))) return damaged;
    checked[name] = rows;
  }
  return {
    ok: true,
    backup: {
      app: appBackupApp,
      version: data.version,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      tables: checked,
    },
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The file name of a backup made on `now`: hive-backup-2026-11-05.json. */
export const appBackupFileName = (now: Date) =>
  `hive-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;

/** Whether a file in the backup folder is one of ours (`hive-backup-YYYY-MM-DD.json`). */
export const isAppBackupFileName = (name: string) =>
  /^hive-backup-\d{4}-\d{2}-\d{2}\.json$/.test(name);

/** The newest of the folder's file names, or null when there is none of ours. */
export function latestAppBackupName(names: readonly string[]): string | null {
  return names.filter(isAppBackupFileName).sort().at(-1) ?? null;
}
