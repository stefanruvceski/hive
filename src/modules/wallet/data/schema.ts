import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Wallet tables. Every table name starts with `wallet_` so modules never collide in hive.db.
// After changing this file run `pnpm db:generate` and commit the new migration (07 §8).

/** A loyalty card: the number and how to draw it. Times are epoch milliseconds. */
export const walletCards = sqliteTable('wallet_cards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  number: text('number').notNull(),
  /** A `CardFormat` (domain/card-format.ts). */
  format: text('format').notNull(),
  /** A key of `CardColors` (domain/card-colors.ts). */
  color: text('color').notNull(),
  note: text('note').notNull().default(''),
  addedAt: integer('added_at').notNull(),
  lastUsed: integer('last_used'),
  uses: integer('uses').notNull().default(0),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
});
