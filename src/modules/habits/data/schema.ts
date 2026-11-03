import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Habits tables. Every table name starts with `habits_` so modules never collide in hive.db.
// After changing this file run `pnpm db:generate` and commit the new migration (07 §8).

/** Part of the day a habit belongs to; groups the Habits list. Stored by value — never rename. */
export const timesOfDay = ['morning', 'afternoon', 'evening', 'anytime'] as const;

export type TimeOfDay = (typeof timesOfDay)[number];

/** How often a habit is due. Stored by value — never rename. */
export const scheduleTypes = ['daily', 'weekdays', 'weekly'] as const;

export type ScheduleType = (typeof scheduleTypes)[number];

/** How a measurable habit's daily amounts roll up over a period. Stored by value — never rename. */
export const aggregations = ['sum', 'avg', 'max', 'last'] as const;

export type Aggregation = (typeof aggregations)[number];

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
  /** Key of the color the user picked (`HabitColors` in theme.ts); null = automatic, from the id. */
  color: text('color'),
  /** `daily` (default), `weekdays` (see `scheduleDays`) or `weekly` (`scheduleTimes` a week). */
  scheduleType: text('schedule_type', { enum: scheduleTypes }).notNull().default('daily'),
  /** The weekdays of a `weekdays` habit as "1,3,5" (1 = Monday … 7 = Sunday). */
  scheduleDays: text('schedule_days'),
  /** How many days a week a `weekly` habit is done. */
  scheduleTimes: integer('schedule_times'),
  /** What a measurable habit counts ("glasses", "min"); null for a yes/no habit. */
  unit: text('unit'),
  /** The daily target of a measurable habit; a habit with a target is measurable. */
  target: real('target'),
  aggregation: text('aggregation', { enum: aggregations }).notNull().default('sum'),
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
    /** What a measurable habit was given that day; null is a plain "done". */
    amount: real('amount'),
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
