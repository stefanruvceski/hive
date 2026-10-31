// Pure Home arrangement: the module registry merged with what the user stored (groups, places,
// pins, hidden apps). Free of React and the database so it is unit-tested directly.

export type HomeGroupRow = { id: string; name: string; position: number };
export type HomeAppRow = {
  moduleId: string;
  groupId: string;
  position: number;
  /** Dock slot; null = not pinned. */
  pinnedPosition: number | null;
  hidden: boolean;
};
export type HomeRows = { groups: readonly HomeGroupRow[]; apps: readonly HomeAppRow[] };

export type HomeGroup<M> = { id: string; name: string; apps: M[] };
export type HomeView<M> =
  | { state: 'no-modules' }
  | { state: 'all-hidden' }
  | { state: 'apps'; groups: HomeGroup<M>[]; pinned: M[] };

/** The Dock holds at most four apps (docs/design/tokens.md). */
export const MAX_PINNED = 4;

/**
 * Stored groups replace the defaults once the user has any. A module without a row sits in its
 * registry group after the stored ones, in registry order; a row whose group is gone falls back
 * to the module's default group, then to the first group. Pinned apps go to the Dock and are not
 * repeated in their group; hidden apps and groups with nothing to show are left out.
 */
export function arrangeHome<M extends { id: string; group: string }>(
  modules: readonly M[],
  rows: HomeRows,
  defaultGroups: readonly { id: string; name: string }[],
): HomeView<M> {
  if (modules.length === 0) return { state: 'no-modules' };

  const groups: HomeGroup<M>[] =
    rows.groups.length > 0
      ? [...rows.groups]
          .sort((a, b) => a.position - b.position)
          .map(({ id, name }) => ({ id, name, apps: [] }))
      : defaultGroups.map(({ id, name }) => ({ id, name, apps: [] }));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const stored = new Map(rows.apps.map((row) => [row.moduleId, row]));

  const placed = modules
    .map((module, index) => ({ module, row: stored.get(module.id), index }))
    .filter(({ row }) => !row?.hidden)
    .map(({ module, row, index }) => ({
      module,
      group:
        groupById.get(row?.groupId ?? module.group) ?? groupById.get(module.group) ?? groups[0],
      rank: row ? row.position : rows.apps.length + index,
      pinnedPosition: row?.pinnedPosition ?? null,
    }));

  if (placed.length === 0) return { state: 'all-hidden' };

  const pinnedSlots = placed
    .filter((app) => app.pinnedPosition !== null)
    .sort((a, b) => (a.pinnedPosition ?? 0) - (b.pinnedPosition ?? 0))
    .slice(0, MAX_PINNED);
  const pinned = new Set(pinnedSlots.map((app) => app.module.id));

  for (const app of [...placed].sort((a, b) => a.rank - b.rank)) {
    if (!pinned.has(app.module.id)) app.group?.apps.push(app.module);
  }

  return {
    state: 'apps',
    groups: groups.filter((group) => group.apps.length > 0),
    pinned: pinnedSlots.map((app) => app.module),
  };
}
