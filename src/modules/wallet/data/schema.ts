import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

/**
 * A fiscal receipt scanned from its QR code. Money is in para (minor units). It is saved at once as
 * `pending` and filled in from the tax office; `source_key` (the `vl` of the link) is unique so
 * the same receipt scanned twice is one row.
 */
export const walletReceipts = sqliteTable('wallet_receipts', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  sourceKey: text('source_key').notNull().unique(),
  /** `pending` | `ok` | `failed`. */
  status: text('status').$type<'pending' | 'ok' | 'failed'>().notNull().default('pending'),
  company: text('company'),
  shop: text('shop'),
  address: text('address'),
  city: text('city'),
  /** The shop's PIB. */
  tin: text('tin'),
  total: integer('total'),
  /** Belgrade local time, `YYYY-MM-DDTHH:mm:ss`. */
  time: text('time'),
  invoiceNumber: text('invoice_number'),
  refund: integer('refund', { mode: 'boolean' }).notNull().default(false),
  payment: text('payment'),
  /** The receipt as printed. */
  journal: text('journal'),
  note: text('note').notNull().default(''),
  error: text('error'),
  addedAt: integer('added_at').notNull(),
  /** The owner's PIB when the receipt belongs to a company; null = personal. */
  buyerTin: text('buyer_tin'),
  /** The owner was set by hand; reading the receipt again keeps it. */
  ownerManual: integer('owner_manual', { mode: 'boolean' }).notNull().default(false),
  starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
});

export const walletReceiptItems = sqliteTable(
  'wallet_receipt_items',
  {
    id: text('id').primaryKey(),
    receiptId: text('receipt_id')
      .notNull()
      .references(() => walletReceipts.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    quantity: real('quantity').notNull(),
    unitPrice: integer('unit_price').notNull(),
    total: integer('total').notNull(),
    unit: text('unit'),
    vat: text('vat'),
  },
  (table) => [index('wallet_receipt_items_receipt_idx').on(table.receiptId)],
);

/**
 * Products merged by hand (Prices): one row per spelling (`key`, the normalized item name), rows of
 * one merge share a `group_id`, `position` 0 is the key everything is filed under. `name` is the
 * group's chosen name (the same on each of its rows), null = the most used spelling.
 */
export const walletProductAliases = sqliteTable('wallet_product_aliases', {
  key: text('key').primaryKey(),
  groupId: text('group_id').notNull(),
  position: integer('position').notNull(),
  name: text('name'),
});

/** The same for shops (`pib:<tin>` or a chain name), e.g. one chain under two PIBs. */
export const walletShopAliases = sqliteTable('wallet_shop_aliases', {
  key: text('key').primaryKey(),
  groupId: text('group_id').notNull(),
  position: integer('position').notNull(),
  name: text('name'),
});

/** Pairs of product keys the user said are not the same, so they are not suggested again (`pair()`). */
export const walletNotSame = sqliteTable('wallet_not_same', {
  pair: text('pair').primaryKey(),
});
