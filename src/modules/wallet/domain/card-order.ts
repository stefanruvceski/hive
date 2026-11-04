export type Orderable = { pinned: boolean; lastUsed: number | null; addedAt: number };

/** The order cards are shown in: pinned first, then the last used, then the newest. */
export function sortCards<T extends Orderable>(cards: readonly T[]): T[] {
  return [...cards].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      (b.lastUsed ?? 0) - (a.lastUsed ?? 0) ||
      b.addedAt - a.addedAt,
  );
}
