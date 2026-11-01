import {
  appActions,
  applyHomeEdit,
  customizeView,
  type HomeEdit,
  HomeEditError,
  materializeHome,
  MAX_GROUP_NAME,
} from './home-edits';
import { arrangeHome, type HomeAppRow, type HomeRows, MAX_PINNED } from './home-groups';

const defaults = [
  { id: 'money', name: 'Money' },
  { id: 'body-mind', name: 'Body & mind' },
  { id: 'creative', name: 'Creative' },
];

type Mod = { id: string; group: string };
const modules: Mod[] = [
  { id: 'money', group: 'money' },
  { id: 'wallet', group: 'money' },
  { id: 'health', group: 'body-mind' },
  { id: 'habits', group: 'body-mind' },
  { id: 'books', group: 'creative' },
  { id: 'music', group: 'creative' },
];

const noRows: HomeRows = { groups: [], apps: [] };

const app = (
  moduleId: string,
  groupId: string,
  position: number,
  extra: Partial<HomeAppRow> = {},
) => ({ moduleId, groupId, position, pinnedPosition: null, hidden: false, ...extra }) as HomeAppRow;

/** Rows as Customize writes them: the defaults materialized. */
const base = () => materializeHome(modules, noRows, defaults);

function ok(rows: HomeRows, edit: HomeEdit): HomeRows {
  const result = applyHomeEdit(rows, edit);
  if (!result.ok) throw new Error(`expected ${edit.kind} to succeed, got ${result.reason}`);
  return result.rows;
}

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);
const home = (rows: HomeRows) => arrangeHome(modules, rows, defaults);
const groupApps = (rows: HomeRows) => {
  const view = home(rows);
  return view.state === 'apps'
    ? Object.fromEntries(view.groups.map((group) => [group.id, ids(group.apps)]))
    : {};
};
const pinned = (rows: HomeRows) => {
  const view = home(rows);
  return view.state === 'apps' ? ids(view.pinned) : [];
};
const row = (rows: HomeRows, moduleId: string) => rows.apps.find((a) => a.moduleId === moduleId);

describe('materializeHome', () => {
  it.each([
    ['no rows yet (registry defaults)', noRows],
    [
      'rows with pins, a hidden app, a stale group and an app without a row',
      {
        groups: [
          { id: 'creative', name: 'Art', position: 0 },
          { id: 'money', name: 'Cash', position: 1 },
        ],
        apps: [
          app('habits', 'gone', 0),
          app('books', 'creative', 1, { pinnedPosition: 1 }),
          app('wallet', 'money', 0, { pinnedPosition: 0 }),
          app('music', 'creative', 0, { hidden: true }),
          app('health', 'money', 2),
        ],
      },
    ],
  ])('writes every group and app so Home looks the same: %s', (_label, rows) => {
    const materialized = materializeHome(modules, rows, defaults);

    expect(home(materialized)).toEqual(home(rows));
    expect(materialized.apps.map((a) => a.moduleId).sort()).toEqual(ids(modules).sort());
    expect(materialized.groups.map((g) => g.position)).toEqual(
      materialized.groups.map((_g, index) => index),
    );
  });

  it('keeps a hidden app hidden and out of the Dock, in a group that exists', () => {
    const rows = materializeHome(
      modules,
      { groups: [], apps: [app('music', 'gone', 0, { hidden: true, pinnedPosition: 0 })] },
      defaults,
    );

    expect(row(rows, 'music')).toMatchObject({
      hidden: true,
      pinnedPosition: null,
      groupId: 'creative',
    });
  });

  it('drops rows of apps that no longer exist', () => {
    const rows = materializeHome(
      modules,
      { groups: [], apps: [app('gone', 'money', 0)] },
      defaults,
    );

    expect(row(rows, 'gone')).toBeUndefined();
  });
});

describe('applyHomeEdit', () => {
  it('moves an app to the end of another group and keeps its Dock slot', () => {
    let rows = ok(base(), { kind: 'pin', moduleId: 'wallet' });
    rows = ok(rows, { kind: 'move-app', moduleId: 'wallet', groupId: 'creative' });

    expect(row(rows, 'wallet')).toMatchObject({
      groupId: 'creative',
      position: 2,
      pinnedPosition: 0,
    });
    expect(row(rows, 'money')).toMatchObject({ groupId: 'money', position: 0 });
    rows = ok(rows, { kind: 'unpin', moduleId: 'wallet' });
    expect(groupApps(rows)).toEqual({
      money: ['money'],
      'body-mind': ['health', 'habits'],
      creative: ['books', 'music', 'wallet'],
    });
  });

  it('unhides an app by moving it to a group', () => {
    let rows = ok(base(), { kind: 'hide', moduleId: 'music' });
    expect(groupApps(rows).creative).toEqual(['books']);

    rows = ok(rows, { kind: 'move-app', moduleId: 'music', groupId: 'money' });

    expect(row(rows, 'music')).toMatchObject({ hidden: false, groupId: 'money' });
    expect(groupApps(rows).money).toEqual(['money', 'wallet', 'music']);
  });

  it('pins up to four apps, in order, then refuses with "dock full"', () => {
    let rows = base();
    for (const moduleId of ['habits', 'money', 'books', 'wallet']) {
      rows = ok(rows, { kind: 'pin', moduleId });
    }

    expect(pinned(rows)).toEqual(['habits', 'money', 'books', 'wallet']);
    expect(MAX_PINNED).toBe(4);
    expect(applyHomeEdit(rows, { kind: 'pin', moduleId: 'music' })).toEqual({
      ok: false,
      reason: 'dock-full',
    });
  });

  it('closes the gap in the Dock when an app is unpinned or hidden', () => {
    let rows = base();
    for (const moduleId of ['habits', 'money', 'books']) rows = ok(rows, { kind: 'pin', moduleId });

    rows = ok(rows, { kind: 'unpin', moduleId: 'habits' });
    expect(pinned(rows)).toEqual(['money', 'books']);
    expect([row(rows, 'money')?.pinnedPosition, row(rows, 'books')?.pinnedPosition]).toEqual([
      0, 1,
    ]);

    rows = ok(rows, { kind: 'hide', moduleId: 'money' });
    expect(pinned(rows)).toEqual(['books']);
    expect(row(rows, 'money')).toMatchObject({
      hidden: true,
      pinnedPosition: null,
      groupId: 'money',
    });
  });

  it('does not pin a hidden app', () => {
    const rows = ok(base(), { kind: 'hide', moduleId: 'books' });

    expect(applyHomeEdit(rows, { kind: 'pin', moduleId: 'books' })).toEqual({
      ok: false,
      reason: 'hidden',
    });
  });

  it('renames a group, trimmed and at most 40 characters, and refuses an empty name', () => {
    const rows = ok(base(), { kind: 'rename-group', groupId: 'money', name: '  Cash  ' });
    expect(rows.groups[0]).toMatchObject({ id: 'money', name: 'Cash' });

    const long = ok(base(), { kind: 'rename-group', groupId: 'money', name: 'x'.repeat(60) });
    expect(long.groups[0]?.name).toHaveLength(MAX_GROUP_NAME);

    expect(applyHomeEdit(base(), { kind: 'rename-group', groupId: 'money', name: '   ' })).toEqual({
      ok: false,
      reason: 'empty-name',
    });
  });

  it.each([
    ['money', 1, ['body-mind', 'money', 'creative']],
    ['creative', -1, ['money', 'creative', 'body-mind']],
    ['money', -1, ['money', 'body-mind', 'creative']],
    ['creative', 1, ['money', 'body-mind', 'creative']],
  ] as const)('moves group %s by %i', (groupId, by, order) => {
    const rows = ok(base(), { kind: 'move-group', groupId, by });

    expect(ids(rows.groups)).toEqual(order);
    expect(rows.groups.map((g) => g.position)).toEqual([0, 1, 2]);
  });

  it('adds a group at the end; Home shows it once it has an app', () => {
    let rows = ok(base(), { kind: 'add-group', groupId: 'group-x', name: 'New group' });
    expect(ids(rows.groups)).toEqual(['money', 'body-mind', 'creative', 'group-x']);
    expect(groupApps(rows)['group-x']).toBeUndefined();

    rows = ok(rows, { kind: 'move-app', moduleId: 'books', groupId: 'group-x' });
    expect(groupApps(rows)['group-x']).toEqual(['books']);
    expect(applyHomeEdit(rows, { kind: 'add-group', groupId: 'money', name: 'Again' })).toEqual({
      ok: false,
      reason: 'duplicate-group',
    });
  });

  it('deletes only empty groups, never the last one, and keeps hidden apps in a group', () => {
    let rows = ok(base(), { kind: 'hide', moduleId: 'books' });
    rows = ok(rows, { kind: 'move-app', moduleId: 'music', groupId: 'money' });
    expect(applyHomeEdit(rows, { kind: 'delete-group', groupId: 'money' })).toEqual({
      ok: false,
      reason: 'group-not-empty',
    });

    // Creative shows no apps now (Books is hidden), so it can go; Books moves to the first group.
    rows = ok(rows, { kind: 'delete-group', groupId: 'creative' });
    expect(ids(rows.groups)).toEqual(['money', 'body-mind']);
    expect(row(rows, 'books')).toMatchObject({ hidden: true, groupId: 'money' });

    const single = { groups: [{ id: 'only', name: 'Only', position: 0 }], apps: [] };
    expect(applyHomeEdit(single, { kind: 'delete-group', groupId: 'only' })).toEqual({
      ok: false,
      reason: 'last-group',
    });
  });

  it.each<[HomeEdit, string]>([
    [{ kind: 'pin', moduleId: 'nope' }, 'unknown-app'],
    [{ kind: 'move-app', moduleId: 'books', groupId: 'nope' }, 'unknown-group'],
    [{ kind: 'rename-group', groupId: 'nope', name: 'X' }, 'unknown-group'],
    [{ kind: 'delete-group', groupId: 'nope' }, 'unknown-group'],
  ])('refuses %o with %s', (edit, reason) => {
    expect(applyHomeEdit(base(), edit)).toEqual({ ok: false, reason });
  });

  it('leaves the rows it was given untouched', () => {
    const rows = base();
    const copy = structuredClone(rows);
    ok(rows, { kind: 'move-app', moduleId: 'books', groupId: 'money' });

    expect(rows).toEqual(copy);
  });
});

describe('HomeEditError', () => {
  it('carries the reason', () => {
    const error = new HomeEditError('dock-full');

    expect(error).toBeInstanceOf(Error);
    expect(error.reason).toBe('dock-full');
  });
});

describe('customizeView', () => {
  it('shows every group (empty ones too) with pinned apps still in them, the Dock and hidden apps', () => {
    let rows = ok(base(), { kind: 'pin', moduleId: 'habits' });
    rows = ok(rows, { kind: 'hide', moduleId: 'books' });
    rows = ok(rows, { kind: 'move-app', moduleId: 'music', groupId: 'money' });

    const view = customizeView(modules, rows, defaults);

    expect(ids(view.pinned)).toEqual(['habits']);
    expect(ids(view.hidden)).toEqual(['books']);
    expect(
      view.groups.map((g) => [g.id, g.apps.map((a) => `${a.app.id}${a.pinned ? '*' : ''}`)]),
    ).toEqual([
      ['money', ['money', 'wallet', 'music']],
      ['body-mind', ['health', 'habits*']],
      ['creative', []],
    ]);
  });

  it('starts from the registry defaults before anything is stored', () => {
    const view = customizeView(modules, noRows, defaults);

    expect(ids(view.groups)).toEqual(['money', 'body-mind', 'creative']);
    expect(view.pinned).toEqual([]);
    expect(view.hidden).toEqual([]);
  });
});

describe('appActions', () => {
  const view = (rows: HomeRows) => customizeView(modules, rows, defaults);

  it('offers Pin, Hide and every other group as a target', () => {
    expect(appActions(view(base()), 'books')).toEqual({
      pin: 'pin',
      hide: 'hide',
      moveTargets: ['money', 'body-mind'],
    });
  });

  it('offers Unpin for a pinned app and "Dock full" once four are pinned', () => {
    let rows = base();
    for (const moduleId of ['habits', 'money', 'books', 'wallet']) {
      rows = ok(rows, { kind: 'pin', moduleId });
    }

    expect(appActions(view(rows), 'habits').pin).toBe('unpin');
    expect(appActions(view(rows), 'music').pin).toBe('dock-full');
  });

  it('offers every group to a hidden app, and no Pin or Hide', () => {
    const rows = ok(base(), { kind: 'hide', moduleId: 'music' });

    expect(appActions(view(rows), 'music')).toEqual({
      pin: 'unavailable',
      hide: 'hidden',
      moveTargets: ['money', 'body-mind', 'creative'],
    });
  });
});
