import { getTableName, is } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { backupTables } from './backup-tables';
import * as habits from './habits/data/schema';
import * as money from './money/data/schema';
import * as wallet from './wallet/data/schema';

const tablesOf = (schema: object) =>
  Object.values(schema).filter((value): value is SQLiteTable => is(value, SQLiteTable));

describe('backupTables', () => {
  it('lists every table of every module, once', () => {
    const listed: string[] = backupTables.map((table) => getTableName(table));
    expect(new Set(listed).size).toBe(listed.length);
    for (const table of [...tablesOf(habits), ...tablesOf(money), ...tablesOf(wallet)]) {
      expect(listed).toContain(getTableName(table));
    }
  });

  it('files parents before the tables that point at them', () => {
    const order: string[] = backupTables.map((table) => getTableName(table));
    const before = (parent: string, child: string) =>
      expect(order.indexOf(parent)).toBeLessThan(order.indexOf(child));
    before('core_businesses', 'money_entries');
    before('money_categories', 'money_entries');
    before('money_entries', 'money_items');
    before('habits_habits', 'habits_completions');
    before('wallet_receipts', 'wallet_receipt_items');
  });
});
