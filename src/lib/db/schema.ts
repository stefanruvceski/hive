import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
