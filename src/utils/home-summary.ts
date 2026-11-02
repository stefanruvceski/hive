// What a module shows on Home's Today section (#33), and which modules show one. Pure: modules,
// screens and hooks all import it.

import type { HomeRows } from './home-groups';

/**
 * A module's summary for today. `label` is what a screen reader says after the app's name
 * ("Habits: 1 of 2 done today").
 */
export type HomeSummary =
  /** A progress ring and a big number: `done` of `total`, `caption` under it. */
  | { kind: 'progress'; done: number; total: number; caption: string; label: string }
  /** A headline and a line under it. */
  | { kind: 'message'; headline: string; body: string; label: string };

/** What a module's `useHomeSummary` returns while its data loads, fails or is ready. */
export type HomeSummaryResult =
  { status: 'pending' } | { status: 'error' } | { status: 'success'; summary: HomeSummary };

type WithSummary<M extends { useHomeSummary?: unknown }> = M & {
  useHomeSummary: NonNullable<M['useHomeSummary']>;
};

/** Modules with a summary hook that the user hasn't hidden on Home, in registry order. */
export function todayModules<M extends { id: string; useHomeSummary?: unknown }>(
  modules: readonly M[],
  rows: HomeRows,
): WithSummary<M>[] {
  const hidden = new Set(rows.apps.filter((row) => row.hidden).map((row) => row.moduleId));
  return modules.filter(
    (module): module is WithSummary<M> =>
      module.useHomeSummary !== undefined && !hidden.has(module.id),
  );
}
