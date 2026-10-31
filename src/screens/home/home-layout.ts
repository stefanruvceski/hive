// Pure Home-layout logic: merging the module registry with the user's stored order/visibility,
// and the edit operations. Kept free of React and the database so it is unit-tested directly.

export type LayoutRow = { moduleId: string; position: number; hidden: boolean };
export type HomeCard<M> = { module: M; hidden: boolean };

/**
 * Registry order is the default. Stored rows override order and visibility; modules added
 * after the user customised the layout go to the end; rows for removed modules are ignored.
 */
export function arrangeModules<M extends { id: string }>(
  modules: readonly M[],
  rows: readonly LayoutRow[],
): HomeCard<M>[] {
  const stored = new Map(rows.map((row) => [row.moduleId, row]));
  return modules
    .map((module, index) => {
      const row = stored.get(module.id);
      return {
        module,
        hidden: row?.hidden ?? false,
        rank: row ? row.position : rows.length + index,
      };
    })
    .sort((a, b) => a.rank - b.rank)
    .map(({ module, hidden }) => ({ module, hidden }));
}

/** Moves the card at `from` one step up (-1) or down (+1); out-of-range moves are no-ops. */
export function moveCard<M>(
  cards: readonly HomeCard<M>[],
  from: number,
  step: -1 | 1,
): HomeCard<M>[] {
  const to = from + step;
  const moving = cards[from];
  const target = cards[to];
  if (!moving || !target) return [...cards];
  const next = [...cards];
  next[from] = target;
  next[to] = moving;
  return next;
}

export function toggleHidden<M>(cards: readonly HomeCard<M>[], index: number): HomeCard<M>[] {
  return cards.map((card, i) => (i === index ? { ...card, hidden: !card.hidden } : card));
}

export function toLayoutRows(cards: readonly HomeCard<{ id: string }>[]): LayoutRow[] {
  return cards.map((card, position) => ({
    moduleId: card.module.id,
    position,
    hidden: card.hidden,
  }));
}
