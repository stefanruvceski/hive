// Pure Habits logic: the backup file. Built from the tables, checked before anything is replaced.
// Tested in backup.test.ts.

import {
  aggregations,
  type habitsCompletions,
  type habitsHabits,
  type habitsMood,
  type habitsReminders,
  type habitsTodos,
  scheduleTypes,
  timesOfDay,
} from '../data/schema';

export const backupApp = 'hive-habits';
/** Bumped when the file's shape changes; a newer file is refused by an older app. */
export const backupVersion = 1;

type Row = Record<string, unknown>;

export type Backup = {
  app: typeof backupApp;
  version: number;
  exportedAt: string;
  habits: (typeof habitsHabits.$inferSelect)[];
  completions: (typeof habitsCompletions.$inferSelect)[];
  todos: (typeof habitsTodos.$inferSelect)[];
  mood: (typeof habitsMood.$inferSelect)[];
  reminders: (typeof habitsReminders.$inferSelect)[];
};

// What each column must be; `?` allows null. A list of values is an enum.
type Kind = 'string' | 'number' | 'boolean' | 'string?' | 'number?' | readonly string[];
type Spec = Record<string, Kind>;

const part = timesOfDay;
const specs: Record<Exclude<keyof Backup, 'app' | 'version' | 'exportedAt'>, Spec> = {
  habits: {
    id: 'string',
    name: 'string',
    emoji: 'string',
    timeOfDay: part,
    position: 'number',
    createdAt: 'string',
    archivedAt: 'string?',
    color: 'string?',
    scheduleType: scheduleTypes,
    scheduleDays: 'string?',
    scheduleTimes: 'number?',
    unit: 'string?',
    target: 'number?',
    aggregation: aggregations,
    quit: 'boolean',
  },
  completions: { habitId: 'string', date: 'string', amount: 'number?' },
  todos: {
    id: 'string',
    title: 'string',
    date: 'string',
    timeOfDay: part,
    done: 'boolean',
    doneAt: 'string?',
    priority: 'boolean',
    position: 'number',
    createdAt: 'string',
  },
  mood: {
    date: 'string',
    mood: 'number',
    motivation: 'number',
    note: 'string?',
    updatedAt: 'string',
  },
  reminders: { timeOfDay: part, enabled: 'boolean', hour: 'number', minute: 'number' },
};

const isRecord = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fits(value: unknown, kind: Kind): boolean {
  if (typeof kind !== 'string') return typeof value === 'string' && kind.includes(value);
  if (kind.endsWith('?')) return value === null || typeof value === kind.slice(0, -1);
  return typeof value === kind;
}

const fitsRow = (row: unknown, spec: Spec): row is Row =>
  isRecord(row) && Object.entries(spec).every(([column, kind]) => fits(row[column], kind));

/** Writes the tables out as one file. */
export function buildBackup(tables: Pick<Backup, keyof typeof specs>, now: Date): Backup {
  return { app: backupApp, version: backupVersion, exportedAt: now.toISOString(), ...tables };
}

export type BackupResult = { ok: true; backup: Backup } | { ok: false; reason: string };

/** Reads a backup file's text. Anything that is not a whole, current backup is refused. */
export function parseBackup(text: string): BackupResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'This file is not a Hive backup.' };
  }
  if (!isRecord(data) || data.app !== backupApp || typeof data.version !== 'number') {
    return { ok: false, reason: 'This file is not a Hive backup.' };
  }
  if (data.version > backupVersion) {
    return {
      ok: false,
      reason: 'This backup is from a newer version of Hive. Update the app first.',
    };
  }
  const tables: Partial<Record<keyof typeof specs, Row[]>> = {};
  for (const [name, spec] of Object.entries(specs) as [keyof typeof specs, Spec][]) {
    const rows = data[name];
    if (!Array.isArray(rows) || !rows.every((row) => fitsRow(row, spec))) {
      return { ok: false, reason: 'This backup is damaged and was not imported.' };
    }
    tables[name] = rows;
  }
  const habitIds = new Set((tables.habits ?? []).map((row) => row.id));
  if (!(tables.completions ?? []).every((row) => habitIds.has(row.habitId))) {
    return { ok: false, reason: 'This backup is damaged and was not imported.' };
  }
  // Every column was checked against `specs`, which mirrors the tables.
  return {
    ok: true,
    backup: {
      app: backupApp,
      version: data.version,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      ...(tables as Pick<Backup, keyof typeof specs>),
    },
  };
}

/** The file name of a backup made on `now`: hive-habits-2026-11-03.json. */
export const backupFileName = (now: Date) =>
  `hive-habits-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`;
