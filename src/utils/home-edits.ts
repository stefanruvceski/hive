// Customize Home (#31): the edits a user makes to Home and the rules they follow. Pure, free of
// React and the database, so it is unit-tested directly. Every save writes the whole arrangement
// `materializeHome` builds, so the first edit turns the registry defaults into rows without
// anything moving on Home.

import { type HomeAppRow, type HomeGroupRow, type HomeRows, MAX_PINNED } from './home-groups';

/** The longest group name; longer names are cut. */
export const MAX_GROUP_NAME = 40;
/** The name a group gets when the user adds one. */
export const NEW_GROUP_NAME = 'New group';

export type HomeEdit =
  /** Puts an app at the end of a group; a hidden app comes back to Home. */
  | { kind: 'move-app'; moduleId: string; groupId: string }
  | { kind: 'pin'; moduleId: string }
  | { kind: 'unpin'; moduleId: string }
  /** Takes an app off Home and out of the Dock; its data stays. */
  | { kind: 'hide'; moduleId: string }
  | { kind: 'rename-group'; groupId: string; name: string }
  | { kind: 'move-group'; groupId: string; by: -1 | 1 }
  /** The caller makes the id, so this stays pure. */
  | { kind: 'add-group'; groupId: string; name: string }
  /** Only a group that shows no apps, and never the last one. */
  | { kind: 'delete-group'; groupId: string };

export type HomeEditRejection =
  | 'dock-full'
  | 'hidden'
  | 'group-not-empty'
  | 'last-group'
  | 'empty-name'
  | 'duplicate-group'
  | 'unknown-app'
  | 'unknown-group';

export type HomeEditResult = { ok: true; rows: HomeRows } | { ok: false; reason: HomeEditRejection };

/** A refused edit, thrown by the save so the mutation fails and rolls back. */
export class HomeEditError extends Error {
  readonly reason: HomeEditRejection;

  constructor(reason: HomeEditRejection) {
    super(`home edit refused: ${reason}`);
    this.name = 'HomeEditError';
    this.reason = reason;
  }
}

type GroupDefaults = readonly { id: string; name: string }[];

/**
 * Every group and every app as rows, placed exactly where `arrangeHome` shows them: stored groups
 * (or the defaults), each app in its stored group (or its default group, or the first one), in
 * the same order, pinned apps in their Dock slots and hidden apps hidden. Positions and Dock slots
 * are renumbered from 0; rows of apps that no longer exist are dropped.
 */
export function materializeHome<M extends { id: string; group: string }>(
  modules: readonly M[],
  rows: HomeRows,
  defaultGroups: GroupDefaults,
): HomeRows {
  const source: GroupDefaults =
    rows.groups.length > 0
      ? [...rows.groups].sort((a, b) => a.position - b.position)
      : defaultGroups;
  const groups: HomeGroupRow[] = source.map(({ id, name }, position) => ({ id, name, position }));
  const groupIds = new Set(groups.map((group) => group.id));
  const stored = new Map(rows.apps.map((row) => [row.moduleId, row]));

  // Same group fallback and ordering as arrangeHome (Dock ties keep registry order, like there).
  const inRegistryOrder = modules.map((module, index) => {
    const row = stored.get(module.id);
    const wanted = row?.groupId ?? module.group;
    const groupId = groupIds.has(wanted)
      ? wanted
      : groupIds.has(module.group)
        ? module.group
        : (groups[0]?.id ?? module.group);
    return {
      moduleId: module.id,
      groupId,
      rank: row ? row.position : rows.apps.length + index,
      pinnedPosition: row?.pinnedPosition ?? null,
      hidden: row?.hidden ?? false,
    };
  });
  const placed = [...inRegistryOrder].sort((a, b) => a.rank - b.rank);

  const pinnedOrder = inRegistryOrder
    .filter((app) => !app.hidden && app.pinnedPosition !== null)
    .sort((a, b) => (a.pinnedPosition ?? 0) - (b.pinnedPosition ?? 0))
    .slice(0, MAX_PINNED)
    .map((app) => app.moduleId);

  return normalize({
    groups,
    apps: placed.map(({ moduleId, groupId, hidden }, position) => ({
      moduleId,
      groupId,
      position,
      pinnedPosition: hidden ? null : indexOrNull(pinnedOrder, moduleId),
      hidden,
    })),
  });
}

/** Applies one edit to materialized rows. Returns new rows; the input is never changed. */
export function applyHomeEdit(rows: HomeRows, edit: HomeEdit): HomeEditResult {
  const groups = [...rows.groups].sort((a, b) => a.position - b.position);
  const apps = rows.apps.map((row) => ({ ...row }));
  const hasGroup = (id: string) => groups.some((group) => group.id === id);
  const done = (next: { groups: HomeGroupRow[]; apps: HomeAppRow[] }): HomeEditResult => ({
    ok: true,
    rows: normalize(next),
  });
  const refuse = (reason: HomeEditRejection): HomeEditResult => ({ ok: false, reason });

  switch (edit.kind) {
    case 'move-app': {
      const app = apps.find((row) => row.moduleId === edit.moduleId);
      if (!app) return refuse('unknown-app');
      if (!hasGroup(edit.groupId)) return refuse('unknown-group');
      if (app.groupId === edit.groupId && !app.hidden) return done({ groups, apps });
      app.groupId = edit.groupId;
      app.hidden = false;
      // After every app already in the group; normalize renumbers.
      app.position = Number.MAX_SAFE_INTEGER;
      return done({ groups, apps });
    }
    case 'pin': {
      const app = apps.find((row) => row.moduleId === edit.moduleId);
      if (!app) return refuse('unknown-app');
      if (app.hidden) return refuse('hidden');
      if (app.pinnedPosition !== null) return done({ groups, apps });
      const pinnedCount = apps.filter((row) => row.pinnedPosition !== null).length;
      if (pinnedCount >= MAX_PINNED) return refuse('dock-full');
      app.pinnedPosition = pinnedCount;
      return done({ groups, apps });
    }
    case 'unpin': {
      const app = apps.find((row) => row.moduleId === edit.moduleId);
      if (!app) return refuse('unknown-app');
      app.pinnedPosition = null;
      return done({ groups, apps });
    }
    case 'hide': {
      const app = apps.find((row) => row.moduleId === edit.moduleId);
      if (!app) return refuse('unknown-app');
      app.hidden = true;
      app.pinnedPosition = null;
      return done({ groups, apps });
    }
    case 'rename-group': {
      if (!hasGroup(edit.groupId)) return refuse('unknown-group');
      const name = cleanName(edit.name);
      if (!name) return refuse('empty-name');
      return done({
        groups: groups.map((group) => (group.id === edit.groupId ? { ...group, name } : group)),
        apps,
      });
    }
    case 'move-group': {
      const from = groups.findIndex((group) => group.id === edit.groupId);
      if (from === -1) return refuse('unknown-group');
      const to = from + edit.by;
      const moved = [...groups];
      if (to >= 0 && to < moved.length) {
        [moved[from], moved[to]] = [moved[to]!, moved[from]!];
      }
      return done({ groups: moved.map((group, position) => ({ ...group, position })), apps });
    }
    case 'add-group': {
      if (hasGroup(edit.groupId)) return refuse('duplicate-group');
      const name = cleanName(edit.name);
      if (!name) return refuse('empty-name');
      return done({
        groups: [...groups, { id: edit.groupId, name, position: groups.length }],
        apps,
      });
    }
    case 'delete-group': {
      if (!hasGroup(edit.groupId)) return refuse('unknown-group');
      if (apps.some((row) => row.groupId === edit.groupId && !row.hidden)) {
        return refuse('group-not-empty');
      }
      const rest = groups.filter((group) => group.id !== edit.groupId);
      const first = rest[0];
      if (!first) return refuse('last-group');
      // Hidden apps keep a real group, so moving them back later has somewhere to start from.
      for (const row of apps) {
        if (row.groupId === edit.groupId) {
          row.groupId = first.id;
          row.position = Number.MAX_SAFE_INTEGER;
        }
      }
      return done({ groups: rest.map((group, position) => ({ ...group, position })), apps });
    }
  }
}

export type CustomizeApp<M> = { app: M; pinned: boolean };
export type CustomizeGroup<M> = { id: string; name: string; apps: CustomizeApp<M>[] };
export type CustomizeView<M> = {
  /** The Dock, in slot order. */
  pinned: M[];
  /** Every group, empty ones too; pinned apps stay in their group here (badged), unlike on Home. */
  groups: CustomizeGroup<M>[];
  /** Hidden apps, in registry order. */
  hidden: M[];
};

/** What Customize shows: the Dock, every group with its apps, and the hidden apps. */
export function customizeView<M extends { id: string; group: string }>(
  modules: readonly M[],
  rows: HomeRows,
  defaultGroups: GroupDefaults,
): CustomizeView<M> {
  const full = materializeHome(modules, rows, defaultGroups);
  const byId = new Map(modules.map((module) => [module.id, module]));
  const rowOf = new Map(full.apps.map((row) => [row.moduleId, row]));
  const visible = full.apps.filter((row) => !row.hidden).sort((a, b) => a.position - b.position);

  return {
    pinned: visible
      .filter((row) => row.pinnedPosition !== null)
      .sort((a, b) => (a.pinnedPosition ?? 0) - (b.pinnedPosition ?? 0))
      .flatMap((row) => byId.get(row.moduleId) ?? []),
    groups: full.groups.map(({ id, name }) => ({
      id,
      name,
      apps: visible
        .filter((row) => row.groupId === id)
        .flatMap((row) => {
          const app = byId.get(row.moduleId);
          return app ? [{ app, pinned: row.pinnedPosition !== null }] : [];
        }),
    })),
    hidden: modules.filter((module) => rowOf.get(module.id)?.hidden),
  };
}

export type AppActions = {
  /** `dock-full`: four are pinned already. `unavailable`: a hidden app can't be pinned. */
  pin: 'pin' | 'unpin' | 'dock-full' | 'unavailable';
  hide: 'hide' | 'hidden';
  /** Groups that offer "Move <app> here": every group not holding it (all of them for a hidden app). */
  moveTargets: string[];
};

/** What the action bar and the groups offer for the selected app. */
export function appActions(view: CustomizeView<{ id: string }>, moduleId: string): AppActions {
  const hidden = view.hidden.some((app) => app.id === moduleId);
  const pinned = view.pinned.some((app) => app.id === moduleId);
  return {
    pin: hidden
      ? 'unavailable'
      : pinned
        ? 'unpin'
        : view.pinned.length >= MAX_PINNED
          ? 'dock-full'
          : 'pin',
    hide: hidden ? 'hidden' : 'hide',
    moveTargets: view.groups
      .filter((group) => !group.apps.some(({ app }) => app.id === moduleId))
      .map((group) => group.id),
  };
}

function cleanName(name: string): string {
  return name.trim().slice(0, MAX_GROUP_NAME).trim();
}

function indexOrNull(list: readonly string[], id: string): number | null {
  const index = list.indexOf(id);
  return index === -1 ? null : index;
}

/**
 * Canonical rows: groups numbered 0…n-1, apps numbered 0…n-1 within their group (keeping their
 * order), Dock slots 0…k-1 (keeping their order), hidden apps never pinned.
 */
function normalize(rows: { groups: HomeGroupRow[]; apps: HomeAppRow[] }): HomeRows {
  const groups = [...rows.groups]
    .sort((a, b) => a.position - b.position)
    .map((group, position) => ({ ...group, position }));
  const groupIndex = new Map(groups.map((group, index) => [group.id, index]));
  const ordered = [...rows.apps].sort(
    (a, b) =>
      (groupIndex.get(a.groupId) ?? 0) - (groupIndex.get(b.groupId) ?? 0) ||
      a.position - b.position,
  );
  const pinnedOrder = ordered
    .filter((row) => !row.hidden && row.pinnedPosition !== null)
    .sort((a, b) => (a.pinnedPosition ?? 0) - (b.pinnedPosition ?? 0))
    .map((row) => row.moduleId);
  const nextInGroup = new Map<string, number>();

  return {
    groups,
    apps: ordered.map((row) => {
      const position = nextInGroup.get(row.groupId) ?? 0;
      nextInGroup.set(row.groupId, position + 1);
      return {
        ...row,
        position,
        pinnedPosition: row.hidden ? null : indexOrNull(pinnedOrder, row.moduleId),
      };
    }),
  };
}
