// What a module shows on Home's Today section (#33), and which modules show one. Pure: modules,
// screens and hooks all import it.

import type { HomeRows } from './home-groups';

/**
 * A module's summary for today. `label` is what a screen reader says after the app's name
 * ("Habits: 1 of 2 done today").
 */
export type HomeSummary =
  /** A small progress ring with `done`/`total`, and what is still to do today, in order. */
  | { kind: 'progress'; done: number; total: number; label: string; upNext: UpNextItem[] }
  /** A headline and a line under it. */
  | { kind: 'message'; headline: string; body: string; label: string };

/** One thing still to do today: `icon` is an emoji or a short symbol shown before its name. */
export type UpNextItem = { id: string; icon: string; name: string };

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

/** A widget lists at most this many things still to do. */
export const UP_NEXT_MAX = 3;

/** What a widget lists: everything if it fits, else one row fewer and how many more there are. */
export function visibleUpNext<T>(items: readonly T[]): { shown: T[]; more: number } {
  if (items.length <= UP_NEXT_MAX) return { shown: [...items], more: 0 };
  const shown = items.slice(0, UP_NEXT_MAX - 1);
  return { shown, more: items.length - shown.length };
}
