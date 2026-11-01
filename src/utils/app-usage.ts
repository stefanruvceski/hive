// How much each app is used, from the opens stored per app and day (`home_app_usage`). Pure and
// free of React and the database, so it is unit-tested directly.

/** Opens of one app on one local day (`YYYY-MM-DD`). */
export type AppUsageRow = { moduleId: string; date: string; opens: number };

/** Only opens from the last 30 days count; older rows are deleted when an open is recorded. */
export const USAGE_WINDOW_DAYS = 30;
/** An open counts half as much a week later. */
export const USAGE_HALF_LIFE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/** Calendar days from `from` to `to` (both `YYYY-MM-DD`); UTC maths, so DST days count once. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / DAY_MS);
}

/** The first day of the usage window that ends on `today`. */
export function oldestUsageDate(today: string): string {
  return new Date(utcDay(today) - (USAGE_WINDOW_DAYS - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** Each app's score: its opens in the window, each weighted down by how many days ago it was. */
export function usageScores(rows: readonly AppUsageRow[], today: string): Map<string, number> {
  const scores = new Map<string, number>();
  for (const { moduleId, date, opens } of rows) {
    const daysAgo = daysBetween(date, today);
    if (daysAgo < 0 || daysAgo >= USAGE_WINDOW_DAYS) continue;
    const weight = 0.5 ** (daysAgo / USAGE_HALF_LIFE_DAYS);
    scores.set(moduleId, (scores.get(moduleId) ?? 0) + opens * weight);
  }
  return scores;
}

/** Most used first; apps with the same score (and unused ones) keep the order they came in. */
export function rankByUsage<M extends { id: string }>(
  apps: readonly M[],
  rows: readonly AppUsageRow[],
  today: string,
): M[] {
  const scores = usageScores(rows, today);
  return [...apps].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
}
