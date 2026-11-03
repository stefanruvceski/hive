// Pure drag-to-reorder logic for the Habits list: no React, no database. Tested in reorder.test.ts.
// Habits and to-dos share one list: every row has a part of the day and a position that runs
// across the parts, so one sequence decides the whole order.

import { timeOfDayOptions } from './habits';
import type { TimeOfDay } from '../data/schema';

export type Row = {
  kind: 'habit' | 'todo';
  id: string;
  timeOfDay: TimeOfDay;
  position: number;
  /** Drawn on the list today. Hidden rows (not due, done yesterday…) are never dragged but are renumbered. */
  visible: boolean;
};

export type Rect = { x: number; y: number; width: number; height: number };

/** Where a part of the day and its rows sit, in the coordinates of the list's content. */
export type PartLayout = {
  timeOfDay: TimeOfDay;
  rect: Rect;
  card: Rect;
  rows: { key: string; rect: Rect }[];
};

/** A place in the list: the part of the day, and how many other visible rows come before it there. */
export type DropTarget = { timeOfDay: TimeOfDay; index: number };

export type Change = { kind: Row['kind']; id: string; position: number; timeOfDay: TimeOfDay };

export const rowKey = (row: Pick<Row, 'kind' | 'id'>) => `${row.kind}-${row.id}`;

const partOrder = (part: TimeOfDay) => timeOfDayOptions.findIndex((o) => o.value === part);

/** Part of the day, then position; a habit before a to-do at the same position, then by id. */
export function orderRows(rows: readonly Row[]): Row[] {
  return [...rows].sort(
    (a, b) =>
      partOrder(a.timeOfDay) - partOrder(b.timeOfDay) ||
      a.position - b.position ||
      (a.kind === b.kind ? 0 : a.kind === 'habit' ? -1 : 1) ||
      a.id.localeCompare(b.id),
  );
}

/** The drop target under a finger at `y`, ignoring the dragged row. */
export function hitTest(
  dragKey: string,
  y: number,
  parts: readonly PartLayout[],
): DropTarget | null {
  let chosen = parts[0];
  for (const part of parts) if (y >= part.rect.y) chosen = part;
  if (!chosen) return null;
  const index = chosen.rows.filter(
    (row) => row.key !== dragKey && row.rect.y + row.rect.height / 2 < y,
  ).length;
  return { timeOfDay: chosen.timeOfDay, index };
}

/** The insertion line for a target: on a row's top edge, under the last row, or in an empty part. */
export function indicatorFor(
  dragKey: string,
  target: DropTarget,
  parts: readonly PartLayout[],
): { x: number; width: number; y: number } | null {
  const part = parts.find((item) => item.timeOfDay === target.timeOfDay);
  if (!part) return null;
  const others = part.rows.filter((row) => row.key !== dragKey);
  const { x, width } = part.card;
  const next = others[target.index];
  if (next) return { x, width, y: next.rect.y };
  const last = others[others.length - 1];
  if (last) return { x, width, y: last.rect.y + last.rect.height };
  return { x, width, y: part.card.y + part.card.height / 2 };
}

/**
 * Drops `dragKey` at `target`. Returns the rows whose position or part of the day changes after the
 * whole list is renumbered 0, 1, 2… in display order; empty when nothing moves.
 */
export function applyDrop(rows: readonly Row[], dragKey: string, target: DropTarget): Change[] {
  const ordered = orderRows(rows);
  const dragged = ordered.find((row) => rowKey(row) === dragKey);
  if (!dragged) return [];
  const rest = ordered.filter((row) => row !== dragged);
  const moved: Row = { ...dragged, timeOfDay: target.timeOfDay };

  const inPart = rest.filter((row) => row.timeOfDay === target.timeOfDay);
  const visible = inPart.filter((row) => row.visible);
  let at: number;
  const before = visible[target.index];
  if (before) at = rest.indexOf(before);
  else if (visible.length > 0) at = rest.indexOf(visible[visible.length - 1] as Row) + 1;
  else if (inPart.length > 0) at = rest.indexOf(inPart[inPart.length - 1] as Row) + 1;
  else {
    const later = rest.findIndex((row) => partOrder(row.timeOfDay) > partOrder(target.timeOfDay));
    at = later === -1 ? rest.length : later;
  }
  const result = [...rest.slice(0, at), moved, ...rest.slice(at)];

  return result.flatMap((row, position) => {
    const was = ordered.find((item) => rowKey(item) === rowKey(row));
    return was && was.position === position && was.timeOfDay === row.timeOfDay
      ? []
      : [{ kind: row.kind, id: row.id, position, timeOfDay: row.timeOfDay }];
  });
}

/**
 * Where a row goes when a screen reader moves it one place up (-1) or down (1): past its visible
 * neighbour, or to the edge of the next part of the day. Null at the ends of the list.
 */
export function moveBy(rows: readonly Row[], key: string, delta: -1 | 1): DropTarget | null {
  const visible = orderRows(rows).filter((row) => row.visible);
  const at = visible.findIndex((row) => rowKey(row) === key);
  const row = visible[at];
  const neighbour = visible[at + delta];
  if (!row || !neighbour) return null;
  const others = visible.filter(
    (item) => item.timeOfDay === neighbour.timeOfDay && rowKey(item) !== key,
  );
  if (neighbour.timeOfDay !== row.timeOfDay) {
    return { timeOfDay: neighbour.timeOfDay, index: delta === 1 ? 0 : others.length };
  }
  const index = others.findIndex((item) => rowKey(item) === rowKey(neighbour));
  return { timeOfDay: row.timeOfDay, index: delta === 1 ? index + 1 : index };
}

/** The items of one kind with the changes that name them applied; others are returned as they are. */
export function withChanges<T extends { id: string; timeOfDay: TimeOfDay; position: number }>(
  items: readonly T[],
  kind: Row['kind'],
  changes: readonly Change[],
): T[] {
  const byId = new Map(changes.filter((c) => c.kind === kind).map((c) => [c.id, c]));
  return items.map((item) => {
    const change = byId.get(item.id);
    return change ? { ...item, position: change.position, timeOfDay: change.timeOfDay } : item;
  });
}
