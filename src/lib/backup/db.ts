// Reads every listed table into a backup and replaces them all from one, all or nothing.
// Which tables, and in which order (parents before children), is the shell's list: the caller's.
import { getTableName, type Table } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { getDb } from '@/lib/db/client';

import { type AppBackup, buildAppBackup } from './app-backup';

type Row = Record<string, unknown>;

/** Every listed table as one backup, made now. */
export function readAppBackup(tables: readonly Table[], now = new Date()): AppBackup {
  const db = getDb();
  const rows: Record<string, Row[]> = {};
  for (const table of tables)
    rows[getTableName(table)] = db
      .select()
      .from(table as SQLiteTable)
      .all();
  return buildAppBackup(rows, now);
}

/** SQLite caps the variables of one statement, so rows go in small batches. */
const BATCH = 40;

/** Replaces the listed tables' rows with the backup's; children are cleared first, parents filled first. */
export function replaceFromBackup(tables: readonly Table[], backup: AppBackup): void {
  getDb().transaction((tx) => {
    for (const table of [...tables].reverse()) tx.delete(table as SQLiteTable).run();
    for (const table of tables) {
      const rows = backup.tables[getTableName(table)] ?? [];
      for (let at = 0; at < rows.length; at += BATCH) {
        tx.insert(table as SQLiteTable)
          .values(rows.slice(at, at + BATCH))
          .run();
      }
    }
  });
}
