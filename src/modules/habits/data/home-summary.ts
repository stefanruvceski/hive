import { useToday } from '@/hooks/use-today';
import type { HomeSummaryResult } from '@/utils/home-summary';

import { useCompletions, useHabits } from './queries';
import { habitsHomeSummary } from '../domain/today';

/**
 * Habits' widget on Home's Today section (#33): how many habits are done today and which are left.
 * Data first: once both queries have data it keeps showing them, even if a background refetch
 * fails (07 §1).
 */
export function useHabitsHomeSummary(): HomeSummaryResult {
  const habits = useHabits();
  const completions = useCompletions();
  const today = useToday();

  if (habits.data && completions.data) {
    return { status: 'success', summary: habitsHomeSummary(habits.data, completions.data, today) };
  }
  if (habits.isError || completions.isError) return { status: 'error' };
  return { status: 'pending' };
}
