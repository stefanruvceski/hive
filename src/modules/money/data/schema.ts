import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// Money tables. Every table name starts with `money_` so modules never collide in hive.db.
// After changing this file run `pnpm db:generate` and commit the new migration (07 §8).
// Amounts are integer minor units (cents/para), never floats; the rate is the only real.

/** Two books kept apart: the person's own money and the company's. Stored by value — never rename. */
export const spaces = ['private', 'business'] as const;
export type Space = (typeof spaces)[number];

/** `payout` moves money from Business to Private; it exists once in each space (see pairId). */
export const entryKinds = ['expense', 'income', 'payout'] as const;
export type EntryKind = (typeof entryKinds)[number];

export const categoryKinds = ['expense', 'income'] as const;
export type CategoryKind = (typeof categoryKinds)[number];

export const frequencies = ['weekly', 'monthly'] as const;
export type Frequency = (typeof frequencies)[number];

/** Small key/value store for this module's own choices (the open view, …). */
export const moneyPrefs = sqliteTable('money_prefs', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** A business the user runs; its PIB (Serbian tax number) is what tells two apart. */
export const moneyBusinesses = sqliteTable('money_businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pib: text('pib').notNull().unique(),
  /** Hidden from new entries but kept on old ones. */
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
});

export const moneyCategories = sqliteTable('money_categories', {
  id: text('id').primaryKey(),
  space: text('space', { enum: spaces }).notNull(),
  kind: text('kind', { enum: categoryKinds }).notNull(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  position: integer('position').notNull(),
  /** Archived categories stay on old entries but are not offered for new ones. */
  archivedAt: text('archived_at'),
});

export const moneyEntries = sqliteTable(
  'money_entries',
  {
    id: text('id').primaryKey(),
    /** Which category list the entry uses; `business` entries also have a `businessId`. */
    space: text('space', { enum: spaces }).notNull(),
    businessId: text('business_id').references(() => moneyBusinesses.id),
    kind: text('kind', { enum: entryKinds }).notNull(),
    /** In the entry's own currency, minor units. */
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    /** RSD per one unit of `currency`; 1 for RSD. */
    rate: real('rate').notNull().default(1),
    /** The RSD value, fixed when saved: totals never move when rates change later. */
    amountRsdMinor: integer('amount_rsd_minor').notNull(),
    /** Null for a payout, or when the entry is split into items. */
    categoryId: text('category_id').references(() => moneyCategories.id),
    /** Local ISO date (`YYYY-MM-DD`). */
    date: text('date').notNull(),
    note: text('note').notNull().default(''),
    /** The two halves of one payout share it. */
    pairId: text('pair_id'),
    /** The rule that created it; with `date` it is unique, so a rule never creates a day twice. */
    recurringId: text('recurring_id'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('money_entries_space_date').on(table.space, table.date),
    uniqueIndex('money_entries_recurring_day').on(table.recurringId, table.date),
  ],
);

/** The parts of one entry (a receipt line); their sum is the entry's amount. */
export const moneyItems = sqliteTable(
  'money_items',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => moneyEntries.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** In the entry's currency, minor units. */
    amountMinor: integer('amount_minor').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => moneyCategories.id),
    position: integer('position').notNull(),
  },
  (table) => [index('money_items_entry').on(table.entryId)],
);

/** Rates seen for a currency on a day: from the source or typed by hand. */
export const moneyRates = sqliteTable(
  'money_rates',
  {
    currency: text('currency').notNull(),
    date: text('date').notNull(),
    /** RSD per one unit. */
    rate: real('rate').notNull(),
    source: text('source', { enum: ['nbs', 'manual'] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.currency, table.date] })],
);

/** A monthly limit per category, valid from `fromMonth` until a later row replaces it. */
export const moneyBudgets = sqliteTable(
  'money_budgets',
  {
    categoryId: text('category_id')
      .notNull()
      .references(() => moneyCategories.id),
    /** `YYYY-MM`. */
    fromMonth: text('from_month').notNull(),
    /** RSD minor units; 0 removes the budget from that month on. */
    limitMinor: integer('limit_minor').notNull(),
  },
  (table) => [primaryKey({ columns: [table.categoryId, table.fromMonth] })],
);

export const moneyRecurring = sqliteTable('money_recurring', {
  id: text('id').primaryKey(),
  space: text('space', { enum: spaces }).notNull(),
  businessId: text('business_id').references(() => moneyBusinesses.id),
  kind: text('kind', { enum: categoryKinds }).notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => moneyCategories.id),
  note: text('note').notNull().default(''),
  frequency: text('frequency', { enum: frequencies }).notNull(),
  /** Weekday 1–7 (Monday = 1) for weekly, day of month 1–31 for monthly. */
  day: integer('day').notNull(),
  startDate: text('start_date').notNull(),
  /** Set when the rule is stopped; later days create nothing. */
  endDate: text('end_date'),
});
