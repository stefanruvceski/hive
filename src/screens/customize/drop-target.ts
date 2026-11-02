// Customize Home drag and drop (#48): where a dragged app or group would land, and the edit that
// makes it so. Pure and free of React Native; Rects are in one shared coordinate space.
import { type HomeEdit } from '@/utils/home-edits';
import { MAX_PINNED } from '@/utils/home-groups';

export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

export type Layouts = {
  /** In Home order. `apps` are the ones Home shows in the group, in order. */
  groups: readonly {
    id: string;
    rect: Rect;
    apps: readonly { moduleId: string; rect: Rect }[];
  }[];
  /** One rect per Dock slot, in slot order. */
  dock: readonly Rect[];
  hidden: Rect | null;
};

export type DragItem =
  | {
      kind: 'app';
      moduleId: string;
      /** In the Dock already (a full Dock still lets it move to another slot). */
      pinned?: boolean;
      /** Dragged from the Dock itself, so it stays there or gets hidden. */
      fromDock?: boolean;
      /** Dragged from Hidden: it returns to a group, never straight into the Dock. */
      hidden?: boolean;
    }
  | { kind: 'group'; groupId: string };

export type DropTarget =
  | { kind: 'group'; groupId: string; index: number }
  | { kind: 'dock'; slot: number }
  | { kind: 'dock-full' }
  | { kind: 'hidden' }
  | { kind: 'group-order'; index: number };

const contains = (rect: Rect, { x, y }: Point) =>
  x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;

/** The place under `point`, or null when dropping here must change nothing. */
export function hitTest(
  item: DragItem,
  point: Point,
  layouts: Layouts,
  context: { pinnedCount: number },
): DropTarget | null {
  if (item.kind === 'group') return hitTestGroup(item.groupId, point, layouts);

  const slot = layouts.dock.findIndex((rect) => contains(rect, point));
  if (slot !== -1) {
    if (item.hidden) return null;
    if (!item.pinned && context.pinnedCount >= MAX_PINNED) return { kind: 'dock-full' };
    return { kind: 'dock', slot };
  }
  if (layouts.hidden && contains(layouts.hidden, point)) return { kind: 'hidden' };

  const group = layouts.groups.find(({ rect }) => contains(rect, point));
  if (!group) return null;
  const index = group.apps
    .filter((other) => other.moduleId !== item.moduleId)
    .filter(({ rect }) => isBefore(rect, point)).length;
  return { kind: 'group', groupId: group.id, index };
}

/** Rows wrap, so an app is before the finger when it is above it, or left of it in the same row. */
function isBefore(rect: Rect, point: Point): boolean {
  if (rect.y + rect.height <= point.y) return true;
  return point.y >= rect.y && rect.x + rect.width / 2 < point.x;
}

function hitTestGroup(groupId: string, point: Point, layouts: Layouts): DropTarget | null {
  const first = layouts.groups[0];
  const last = layouts.groups[layouts.groups.length - 1];
  if (!first || !last) return null;
  const inside =
    point.x >= first.rect.x &&
    point.x <= first.rect.x + first.rect.width &&
    point.y >= first.rect.y &&
    point.y <= last.rect.y + last.rect.height;
  if (!inside) return null;
  const index = layouts.groups
    .filter((group) => group.id !== groupId)
    .filter(({ rect }) => rect.y + rect.height / 2 < point.y).length;
  return { kind: 'group-order', index };
}

/** The edit for a drop, or null when nothing should change (no target, Dock full, wrong place). */
export function dropToEdit(item: DragItem, target: DropTarget | null): HomeEdit | null {
  if (!target) return null;
  if (item.kind === 'group') {
    return target.kind === 'group-order'
      ? { kind: 'move-group', groupId: item.groupId, to: target.index }
      : null;
  }
  switch (target.kind) {
    case 'group':
      if (item.fromDock) return null;
      return {
        kind: 'move-app',
        moduleId: item.moduleId,
        groupId: target.groupId,
        index: target.index,
      };
    case 'dock':
      return { kind: 'pin', moduleId: item.moduleId, slot: target.slot };
    case 'hidden':
      return { kind: 'hide', moduleId: item.moduleId };
    case 'dock-full':
    case 'group-order':
      return null;
  }
}

export type Indicator = { shape: 'bar' | 'outline'; rect: Rect };

/**
 * What to draw for a target: a bar of thickness `bar` centred in the `gap` between two apps (or
 * two groups), or an outline round the place that takes the drop. Null draws nothing.
 */
export function indicatorFor(
  item: DragItem,
  target: DropTarget | null,
  layouts: Layouts,
  bar: number,
  gap: number,
): Indicator | null {
  if (!target) return null;
  switch (target.kind) {
    case 'dock':
      return layouts.dock[target.slot]
        ? { shape: 'outline', rect: layouts.dock[target.slot]! }
        : null;
    case 'hidden':
      return layouts.hidden ? { shape: 'outline', rect: layouts.hidden } : null;
    case 'dock-full':
      return null;
    case 'group': {
      const group = layouts.groups.find(({ id }) => id === target.groupId);
      if (!group) return null;
      const others = group.apps.filter(
        (other) => item.kind !== 'app' || other.moduleId !== item.moduleId,
      );
      const next = others[target.index];
      const last = others[others.length - 1];
      if (next) {
        const { x, y, height } = next.rect;
        return { shape: 'bar', rect: { x: x - gap / 2 - bar / 2, y, width: bar, height } };
      }
      if (last) {
        const { x, y, width, height } = last.rect;
        return { shape: 'bar', rect: { x: x + width + gap / 2 - bar / 2, y, width: bar, height } };
      }
      return { shape: 'outline', rect: group.rect };
    }
    case 'group-order': {
      const others = layouts.groups.filter(
        ({ id }) => item.kind !== 'group' || id !== item.groupId,
      );
      const next = others[target.index];
      const last = others[others.length - 1];
      if (next) {
        const { x, y, width } = next.rect;
        return { shape: 'bar', rect: { x, y: y - gap / 2 - bar / 2, width, height: bar } };
      }
      if (last) {
        const { x, y, width, height } = last.rect;
        return { shape: 'bar', rect: { x, y: y + height + gap / 2 - bar / 2, width, height: bar } };
      }
      return null;
    }
  }
}
