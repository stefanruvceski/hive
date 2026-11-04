// Pure Money logic: the categories a space starts with. Tested in categories.test.ts.

import type { CategoryKind, Space } from '../data/schema';

export type DefaultCategory = { kind: CategoryKind; name: string; emoji: string };

/** What each space starts with; the user edits them afterwards. */
export const defaultCategories: Record<Space, readonly DefaultCategory[]> = {
  private: [
    { kind: 'expense', name: 'Food', emoji: '🛒' },
    { kind: 'expense', name: 'Eating out', emoji: '🍽️' },
    { kind: 'expense', name: 'Transport', emoji: '🚌' },
    { kind: 'expense', name: 'Home', emoji: '🏠' },
    { kind: 'expense', name: 'Health', emoji: '💊' },
    { kind: 'expense', name: 'Fun', emoji: '🎬' },
    { kind: 'expense', name: 'Other', emoji: '📦' },
    { kind: 'income', name: 'Salary', emoji: '💼' },
    { kind: 'income', name: 'Other income', emoji: '💰' },
  ],
  business: [
    { kind: 'expense', name: 'Fuel', emoji: '⛽' },
    { kind: 'expense', name: 'Supplies', emoji: '🧰' },
    { kind: 'expense', name: 'Services', emoji: '🧾' },
    { kind: 'expense', name: 'Taxes', emoji: '🏛️' },
    { kind: 'expense', name: 'Other', emoji: '📦' },
    { kind: 'income', name: 'Revenue', emoji: '💵' },
    { kind: 'income', name: 'Other income', emoji: '💰' },
  ],
};

/** A trimmed name, or null when it is empty. */
export const normalizeName = (name: string): string | null =>
  name.trim().replace(/\s+/g, ' ') || null;

/** Whether a space already has a live category of that kind with the same name (case-insensitive). */
export const nameTaken = (
  categories: readonly { kind: CategoryKind; name: string; archivedAt: string | null }[],
  kind: CategoryKind,
  name: string,
): boolean =>
  categories.some(
    (c) => !c.archivedAt && c.kind === kind && c.name.toLowerCase() === name.toLowerCase(),
  );
