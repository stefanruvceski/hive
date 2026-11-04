import { useToday } from '@/hooks/use-today';
import type { HomeSummaryResult } from '@/utils/home-summary';

import { useBudgets } from './budget-queries';
import { useBusinesses } from './business-queries';
import { useActiveView, useCategories, useEntries, useItems } from './queries';
import { moneyHomeSummary } from '../domain/home-summary';
import { resolveView } from '../domain/owners';

/**
 * Money's widget on Home's Today section: this month's balance and spending in the open view.
 * Data first: once the data is in it keeps showing it, even if a background refetch fails.
 */
export function useMoneyHomeSummary(): HomeSummaryResult {
  const entries = useEntries();
  const saved = useActiveView();
  const businesses = useBusinesses();
  const items = useItems();
  const categories = useCategories();
  const budgets = useBudgets();
  const today = useToday();

  const queries = [entries, saved, businesses, items, categories, budgets];
  if (
    entries.data &&
    saved.data !== undefined &&
    businesses.data &&
    items.data &&
    categories.data &&
    budgets.data
  ) {
    const view = resolveView(saved.data, businesses.data);
    return {
      status: 'success',
      summary: moneyHomeSummary(
        entries.data,
        items.data,
        categories.data,
        budgets.data,
        businesses.data,
        view,
        today,
      ),
    };
  }
  if (queries.some((query) => query.isError)) return { status: 'error' };
  return { status: 'pending' };
}
