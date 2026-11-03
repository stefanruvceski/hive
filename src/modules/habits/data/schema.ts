import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Habits tables. Every table name starts with `habits_` so modules never collide in hive.db.
// After changing this file run `pnpm db:generate` and commit the new migration (07 §8).

/** Part of the day a habit belongs to; groups the Habits list. Stored by value — never rename. */
export const timesOfDay = ['morning', 'afternoon', 'evening', 'anytime'] as const;

export type TimeOfDay = (typeof timesOfDay)[number];

/** The habits the user added, in the order they were added (`position`). */
export const habitsHabits = sqliteTable('habits_habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  timeOfDay: text('time_of_day', { enum: timesOfDay }).notNull(),
  position: integer('position').notNull(),
  /** Local ISO date (`YYYY-MM-DD`) the habit was added; later stories count days from it. */
  createdAt: text('created_at').notNull(),
  /** Local ISO date the habit was archived; null while it is active. Its completions are kept. */
  archivedAt: text('archived_at'),
});

/** The days a habit was done: one row per habit and local date. No row = not done that day. */
export const habitsCompletions = sqliteTable(
  'habits_completions',
  {
    habitId: text('habit_id')
      .notNull()
      .references(() => habitsHabits.id, { onDelete: 'cascade' }),
    /** Local ISO date (`YYYY-MM-DD`) in the phone's time zone, from `toIsoDate`. */
    date: text('date').notNull(),
  },
  (table) => [primaryKey({ columns: [table.habitId, table.date] })],
);

/** One mood and motivation entry per local day (1–5 each, optional note). */
export const habitsMood = sqliteTable('habits_mood', {
  /** Local ISO date (`YYYY-MM-DD`); one entry per day. */
  date: text('date').primaryKey(),
  mood: integer('mood').notNull(),
  motivation: integer('motivation').notNull(),
  note: text('note'),
  /** ISO timestamp of the last save. */
  updatedAt: text('updated_at').notNull(),
});
