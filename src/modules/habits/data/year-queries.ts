import { queryOptions, useQuery } from '@tanstack/react-query';
import { between, isNull } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { habitsKeys } from './queries';
import { habitsCompletions, habitsHabits } from './schema';
import type { Completion } from '../domain/streak';
import type { YearHabit } from '../domain/year';

export type YearData = { habits: YearHabit[]; completions: Completion[] };

/** The habits and every day they were done in one calendar year. Read-only. */
export const habitsYearQuery = (year: number) =>
  queryOptions({
    // Under `habitsKeys.completions()`, so marking a habit done refreshes a year that was opened.
    queryKey: [...habitsKeys.completions(), 'year', year] as const,
    queryFn: async (): Promise<YearData> => {
      const db = getDb();
      return {
        habits: db
          .select({
            id: habitsHabits.id,
            name: habitsHabits.name,
            color: habitsHabits.color,
            scheduleType: habitsHabits.scheduleType,
            scheduleDays: habitsHabits.scheduleDays,
            scheduleTimes: habitsHabits.scheduleTimes,
            target: habitsHabits.target,
            quit: habitsHabits.quit,
          })
          .from(habitsHabits)
          .where(isNull(habitsHabits.archivedAt))
          .all(),
        completions: db
          .select()
          .from(habitsCompletions)
          .where(between(habitsCompletions.date, `${year}-01-01`, `${year}-12-31`))
          .all(),
      };
    },
  });

export function useYear(year: number) {
  return useQuery(habitsYearQuery(year));
}
