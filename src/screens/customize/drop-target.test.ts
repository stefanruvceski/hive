import { type DragItem, dropToEdit, hitTest, indicatorFor, type Layouts } from './drop-target';

const r = (x: number, y: number, width = 80, height = 80) => ({ x, y, width, height });

// Two groups side by side in a column: money (2 apps in one row), creative (3 apps, 2 rows).
const layouts: Layouts = {
  groups: [
    {
      id: 'money',
      rect: r(0, 100, 320, 100),
      apps: [
        { moduleId: 'money', rect: r(0, 110) },
        { moduleId: 'wallet', rect: r(100, 110) },
      ],
    },
    {
      id: 'creative',
      rect: r(0, 220, 320, 200),
      apps: [
        { moduleId: 'books', rect: r(0, 230) },
        { moduleId: 'music', rect: r(100, 230) },
        { moduleId: 'photos', rect: r(0, 320) },
      ],
    },
  ],
  dock: [r(0, 0, 70, 70), r(80, 0, 70, 70), r(160, 0, 70, 70), r(240, 0, 70, 70)],
  hidden: r(0, 440, 320, 100),
};
const app = (moduleId: string, pinned = false): DragItem => ({ kind: 'app', moduleId, pinned });
const ctx = { pinnedCount: 2 };

describe('hitTest — apps', () => {
  it.each([
    [{ x: 10, y: 150 }, 0],
    [{ x: 90, y: 150 }, 1],
    [{ x: 310, y: 150 }, 2],
  ])('picks the index in the group under %j', (point, index) => {
    expect(hitTest(app('habits'), point, layouts, ctx)).toEqual({
      kind: 'group',
      groupId: 'money',
      index,
    });
  });

  it('leaves out the dragged app when it counts the index', () => {
    expect(hitTest(app('money'), { x: 310, y: 150 }, layouts, ctx)).toEqual({
      kind: 'group',
      groupId: 'money',
      index: 1,
    });
  });

  it('follows rows that wrap', () => {
    expect(hitTest(app('habits'), { x: 10, y: 400 }, layouts, ctx)).toEqual({
      kind: 'group',
      groupId: 'creative',
      index: 3,
    });
    expect(hitTest(app('habits'), { x: 150, y: 270 }, layouts, ctx)).toEqual({
      kind: 'group',
      groupId: 'creative',
      index: 2,
    });
  });

  it('drops into an empty group at index 0', () => {
    const empty: Layouts = {
      ...layouts,
      groups: [{ id: 'empty', rect: r(0, 100, 320, 60), apps: [] }],
    };
    expect(hitTest(app('habits'), { x: 50, y: 120 }, empty, ctx)).toEqual({
      kind: 'group',
      groupId: 'empty',
      index: 0,
    });
  });

  it('targets a Dock slot, and the hidden section', () => {
    expect(hitTest(app('habits'), { x: 100, y: 30 }, layouts, ctx)).toEqual({
      kind: 'dock',
      slot: 1,
    });
    expect(hitTest(app('habits'), { x: 50, y: 480 }, layouts, ctx)).toEqual({ kind: 'hidden' });
  });

  it('refuses a fifth app, but lets a pinned app move inside a full Dock', () => {
    const full = { pinnedCount: 4 };
    expect(hitTest(app('habits'), { x: 100, y: 30 }, layouts, full)).toEqual({ kind: 'dock-full' });
    expect(hitTest(app('habits', true), { x: 100, y: 30 }, layouts, full)).toEqual({
      kind: 'dock',
      slot: 1,
    });
  });

  it('returns null outside every valid place', () => {
    expect(hitTest(app('habits'), { x: 150, y: 90 }, layouts, ctx)).toBeNull();
    expect(hitTest(app('habits'), { x: 150, y: 700 }, layouts, ctx)).toBeNull();
  });
});

describe('hitTest — groups', () => {
  const group = (groupId: string): DragItem => ({ kind: 'group', groupId });

  it.each([
    [{ x: 50, y: 110 }, 0],
    [{ x: 50, y: 380 }, 1],
    [{ x: 50, y: 210 }, 0],
  ])('orders by the vertical position %j', (point, index) => {
    expect(hitTest(group('money'), point, layouts, ctx)).toEqual({ kind: 'group-order', index });
  });

  it('puts the group first when dragged to the top, last when dragged below the rest', () => {
    expect(hitTest(group('creative'), { x: 50, y: 105 }, layouts, ctx)).toEqual({
      kind: 'group-order',
      index: 0,
    });
    expect(hitTest(group('money'), { x: 50, y: 415 }, layouts, ctx)).toEqual({
      kind: 'group-order',
      index: 1,
    });
  });

  it('ignores the Dock and Hidden, and a point outside the groups', () => {
    expect(hitTest(group('money'), { x: 50, y: 30 }, layouts, ctx)).toBeNull();
    expect(hitTest(group('money'), { x: 50, y: 480 }, layouts, ctx)).toBeNull();
  });
});

describe('dropToEdit', () => {
  it.each([
    [
      app('habits'),
      { kind: 'group', groupId: 'money', index: 1 } as const,
      { kind: 'move-app', moduleId: 'habits', groupId: 'money', index: 1 },
    ],
    [
      app('habits'),
      { kind: 'dock', slot: 2 } as const,
      { kind: 'pin', moduleId: 'habits', slot: 2 },
    ],
    [app('habits'), { kind: 'hidden' } as const, { kind: 'hide', moduleId: 'habits' }],
    [
      { kind: 'group', groupId: 'money' } as const,
      { kind: 'group-order', index: 1 } as const,
      { kind: 'move-group', groupId: 'money', to: 1 },
    ],
  ])('turns %j onto %j into an edit', (item, target, edit) => {
    expect(dropToEdit(item, target)).toEqual(edit);
  });

  it('changes nothing for no target, a full Dock, or a mismatched pair', () => {
    expect(dropToEdit(app('habits'), null)).toBeNull();
    expect(dropToEdit(app('habits'), { kind: 'dock-full' })).toBeNull();
    expect(dropToEdit(app('habits'), { kind: 'group-order', index: 0 })).toBeNull();
    expect(dropToEdit({ kind: 'group', groupId: 'money' }, { kind: 'hidden' })).toBeNull();
  });
});

describe('drag rules that follow from where an app comes from', () => {
  it('does not take a hidden app into the Dock (it has to come back to a group first)', () => {
    const hidden: DragItem = { kind: 'app', moduleId: 'habits', hidden: true };

    expect(hitTest(hidden, { x: 100, y: 30 }, layouts, ctx)).toBeNull();
    expect(hitTest(hidden, { x: 10, y: 150 }, layouts, ctx)).toEqual({
      kind: 'group',
      groupId: 'money',
      index: 0,
    });
  });

  it('keeps a Dock app in the Dock or hides it, but does not drop it into a group', () => {
    const docked: DragItem = { kind: 'app', moduleId: 'money', pinned: true, fromDock: true };
    const group = { kind: 'group', groupId: 'money', index: 0 } as const;

    expect(dropToEdit(docked, group)).toBeNull();
    expect(dropToEdit(docked, { kind: 'dock', slot: 1 })).toEqual({
      kind: 'pin',
      moduleId: 'money',
      slot: 1,
    });
    expect(dropToEdit(docked, { kind: 'hidden' })).toEqual({ kind: 'hide', moduleId: 'money' });
  });
});

describe('indicatorFor', () => {
  const bar = 4;
  const gap = 20;

  it('draws a bar in the gap before the app at the index, or after the last one', () => {
    expect(
      indicatorFor(app('habits'), { kind: 'group', groupId: 'money', index: 1 }, layouts, bar, gap),
    ).toEqual({ shape: 'bar', rect: { x: 88, y: 110, width: 4, height: 80 } });
    expect(
      indicatorFor(app('habits'), { kind: 'group', groupId: 'money', index: 2 }, layouts, bar, gap),
    ).toEqual({ shape: 'bar', rect: { x: 188, y: 110, width: 4, height: 80 } });
  });

  it('does not count the dragged app', () => {
    expect(
      indicatorFor(app('money'), { kind: 'group', groupId: 'money', index: 0 }, layouts, bar, gap),
    ).toEqual({ shape: 'bar', rect: { x: 88, y: 110, width: 4, height: 80 } });
  });

  it('outlines an empty group, a Dock slot and the hidden section', () => {
    const empty: Layouts = { ...layouts, groups: [{ id: 'e', rect: r(0, 0, 50, 50), apps: [] }] };
    expect(
      indicatorFor(app('x'), { kind: 'group', groupId: 'e', index: 0 }, empty, bar, gap),
    ).toEqual({ shape: 'outline', rect: r(0, 0, 50, 50) });
    expect(indicatorFor(app('x'), { kind: 'dock', slot: 2 }, layouts, bar, gap)).toEqual({
      shape: 'outline',
      rect: layouts.dock[2],
    });
    expect(indicatorFor(app('x'), { kind: 'hidden' }, layouts, bar, gap)).toEqual({
      shape: 'outline',
      rect: layouts.hidden,
    });
  });

  it('draws a flat bar between groups, and nothing for no target or a full Dock', () => {
    expect(
      indicatorFor(
        { kind: 'group', groupId: 'money' },
        { kind: 'group-order', index: 1 },
        layouts,
        bar,
        gap,
      ),
    ).toEqual({ shape: 'bar', rect: { x: 0, y: 428, width: 320, height: 4 } });
    expect(indicatorFor(app('x'), null, layouts, bar, gap)).toBeNull();
    expect(indicatorFor(app('x'), { kind: 'dock-full' }, layouts, bar, gap)).toBeNull();
  });
});
