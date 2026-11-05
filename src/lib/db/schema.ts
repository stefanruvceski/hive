import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Core (shell) tables. Module tables live in src/modules/<id>/data/schema.ts and are prefixed
// with the module id (e.g. `habits_entries`) so modules never collide in the shared database.

/**
 * Home groups the user arranged (#31). Empty until then: the default groups live in
 * `src/modules/registry.ts` (`defaultHomeGroups`) and stored rows override them.
 */
export const homeGroups = sqliteTable('home_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
});

/**
 * Where each module sits on Home: its group and place in it, its Dock slot (null = not pinned)
 * and whether it is hidden. A module without a row uses its registry defaults.
 */
export const homeApps = sqliteTable('home_apps', {
  moduleId: text('module_id').primaryKey(),
  groupId: text('group_id').notNull(),
  position: integer('position').notNull(),
  pinnedPosition: integer('pinned_position'),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
});

/** App-wide preferences (Settings), one row per key; values are JSON. Read via `useAppSettings()`. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/**
 * How often each app was opened from Home, per local day (`YYYY-MM-DD`). Ranks the apps on a group
 * card (`src/utils/app-usage.ts`); rows older than the 30-day window are deleted on the next open.
 */
export const homeAppUsage = sqliteTable(
  'home_app_usage',
  {
    moduleId: text('module_id').notNull(),
    date: text('date').notNull(),
    opens: integer('opens').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.moduleId, table.date] })],
);

/** Module events outbox (ADR 0003): append-only, deleted once every registered consumer has read it. */
export const coreEvents = sqliteTable('core_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  version: integer('version').notNull(),
  payload: text('payload').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** One row per registered event consumer: the last event it handled. */
export const coreEventCursor = sqliteTable('core_event_cursor', {
  consumer: text('consumer').primaryKey(),
  lastEventId: integer('last_event_id').notNull(),
});

/**
 * The businesses the user runs, shared by every module (ADR 0004). Money owners, Wallet receipts
 * and their buyer all point at the same row; the PIB (Serbian tax number) tells two apart.
 */
export const coreBusinesses = sqliteTable('core_businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pib: text('pib').notNull().unique(),
  /** Hidden from new entries but kept on old ones. */
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
});
