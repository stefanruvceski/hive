// Pure Money logic: monthly budgets per category. Tested in budgets.test.ts.

export type BudgetRow = { categoryId: string; fromMonth: string; limitMinor: number };

/**
 * The limit in force for a category in a month: the latest row starting on or before it. A row of 0
 * means "no budget from here on". Changing a budget never rewrites earlier months.
 */
export function effectiveLimit(
  rows: readonly BudgetRow[],
  categoryId: string,
  month: string,
): number | null {
  let latest: BudgetRow | undefined;
  for (const row of rows) {
    if (row.categoryId !== categoryId || row.fromMonth > month) continue;
    if (!latest || row.fromMonth > latest.fromMonth) latest = row;
  }
  return latest && latest.limitMinor > 0 ? latest.limitMinor : null;
}

export type BudgetState = 'ok' | 'warn' | 'over';

/** `warn` from 80% of the limit, `over` once it is reached. `ratio` can exceed 1. */
export function budgetStatus(spent: number, limit: number): { ratio: number; state: BudgetState } {
  const ratio = limit > 0 ? spent / limit : 0;
  return { ratio, state: ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok' };
}
