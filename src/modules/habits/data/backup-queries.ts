import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getDb } from '@/lib/db/client';

import { habitsKeys } from './queries';
import {
  habitsCompletions,
  habitsHabits,
  habitsMood,
  habitsReminders,
  habitsTodos,
} from './schema';
import { buildBackup, type Backup } from '../domain/backup';

/** Every Habits table as one backup, made now. */
export function readBackup(now = new Date()): Backup {
  const db = getDb();
  return buildBackup(
    {
      habits: db.select().from(habitsHabits).all(),
      completions: db.select().from(habitsCompletions).all(),
      todos: db.select().from(habitsTodos).all(),
      mood: db.select().from(habitsMood).all(),
      reminders: db.select().from(habitsReminders).all(),
    },
    now,
  );
}

/** Replaces all Habits data with the backup's, all or nothing. */
export function useImportBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (backup: Backup) => {
      getDb().transaction((tx) => {
        tx.delete(habitsCompletions).run();
        tx.delete(habitsHabits).run();
        tx.delete(habitsTodos).run();
        tx.delete(habitsMood).run();
        tx.delete(habitsReminders).run();
        // SQLite caps the variables of one statement, so rows go in small batches.
        const insert = <T extends object>(rows: T[], write: (batch: T[]) => void) => {
          for (let at = 0; at < rows.length; at += 50) write(rows.slice(at, at + 50));
        };
        insert(backup.habits, (rows) => tx.insert(habitsHabits).values(rows).run());
        insert(backup.completions, (rows) => tx.insert(habitsCompletions).values(rows).run());
        insert(backup.todos, (rows) => tx.insert(habitsTodos).values(rows).run());
        insert(backup.mood, (rows) => tx.insert(habitsMood).values(rows).run());
        insert(backup.reminders, (rows) => tx.insert(habitsReminders).values(rows).run());
      });
    },
    // `habitsKeys.all` is the prefix of every Habits query (lists, completions, mood, reminders).
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsKeys.all }),
  });
}
