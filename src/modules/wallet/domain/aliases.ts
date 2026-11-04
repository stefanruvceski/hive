// Merging by hand: keys that are one product or one shop, with an optional chosen name. Ported from
// hive-poc Aliases.kt (pure, tested in aliases.test.ts).

export type AliasGroup = { keys: string[]; name: string | null };

export const groupOf = (groups: readonly AliasGroup[], key: string): AliasGroup | undefined =>
  groups.find((g) => g.keys.includes(key));

/** The key everything merged with `key` is filed under. */
export const canonical = (groups: readonly AliasGroup[], key: string): string =>
  groupOf(groups, key)?.keys[0] ?? key;

/** `b` (and everything merged with it) joins `a`; `a`'s name and key stay. */
export function merge(groups: readonly AliasGroup[], a: string, b: string): AliasGroup[] {
  const ga = groupOf(groups, a);
  const gb = groupOf(groups, b);
  if (ga && ga === gb) return [...groups];
  const keys = [...new Set([...(ga?.keys ?? [a]), ...(gb?.keys ?? [b])])];
  return [
    ...groups.filter((g) => g !== ga && g !== gb),
    { keys, name: ga?.name ?? gb?.name ?? null },
  ];
}

/** Sets (or clears, with a blank name) the name shown for `key`'s group. */
export function rename(
  groups: readonly AliasGroup[],
  key: string,
  name: string | null,
): AliasGroup[] {
  const n = name?.trim() || null;
  const g = groupOf(groups, key);
  if (!g) return n === null ? [...groups] : [...groups, { keys: [key], name: n }];
  return groups
    .map((it) => (it === g ? { ...it, name: n } : it))
    .filter((it) => it.keys.length > 1 || it.name !== null);
}

/** Splits `key`'s group back into separate keys (a chosen name is dropped with it). */
export function unmerge(groups: readonly AliasGroup[], key: string): AliasGroup[] {
  const g = groupOf(groups, key);
  return g ? groups.filter((it) => it !== g) : [...groups];
}

/** The order-free id of two keys that were marked "not the same". */
export const pair = (a: string, b: string): string => [a, b].sort().join('|');

/** A stored alias row (see `walletProductAliases`). */
export type AliasRow = { key: string; groupId: string; position: number; name: string | null };

/** Rows → groups, keys in `position` order. */
export function groupsFromRows(rows: readonly AliasRow[]): AliasGroup[] {
  const byGroup = new Map<string, AliasRow[]>();
  for (const row of rows) byGroup.set(row.groupId, [...(byGroup.get(row.groupId) ?? []), row]);
  return [...byGroup.values()].map((rs) => {
    const sorted = [...rs].sort((a, b) => a.position - b.position);
    return { keys: sorted.map((r) => r.key), name: sorted[0]?.name ?? null };
  });
}

/** Groups → rows; `newId` names each group. */
export const rowsFromGroups = (groups: readonly AliasGroup[], newId: () => string): AliasRow[] =>
  groups.flatMap((g) => {
    const groupId = newId();
    return g.keys.map((key, position) => ({ key, groupId, position, name: g.name }));
  });
