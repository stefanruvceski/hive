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

/**
 * One group as Home shows it (the group folder): every app in it, in order, pinned and hidden apps
 * left out. Null when the group is unknown, has nothing to show, or Home shows no groups.
 */
export function findGroup<M>(view: HomeView<M>, groupId: string): HomeGroup<M> | null {
  if (view.state !== 'apps') return null;
  return view.groups.find((group) => group.id === groupId) ?? null;
}

/** A group card holds four tiles (2×2). */
export const CARD_TILES = 4;

/**
 * What a group card shows (App Library style). Four apps or fewer: every app is a big tile that
 * opens it, in group order. More: the three most used (`ranked`) stay big and the rest go to the
 * fourth spot as small icons, which opens the whole group.
 */
export function cardTiles<M>(apps: readonly M[], ranked: readonly M[]): { open: M[]; more: M[] } {
  if (apps.length <= CARD_TILES) return { open: [...apps], more: [] };
  return { open: ranked.slice(0, CARD_TILES - 1), more: ranked.slice(CARD_TILES - 1) };
}
