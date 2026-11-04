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
