import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Core (shell) tables. Module tables live in src/modules/<id>/data/schema.ts and are prefixed
// with the module id (e.g. `habits_entries`) so modules never collide in the shared database.

/** The user's Home layout: order and visibility of each module card. */
export const homeModules = sqliteTable('home_modules', {
  moduleId: text('module_id').primaryKey(),
  position: integer('position').notNull(),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
});
