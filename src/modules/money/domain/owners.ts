// Pure Money logic: who an entry belongs to (Private or one of the user's businesses), the view
// that filters by it, and the Serbian tax number (PIB) that identifies a business. Tested in
// owners.test.ts.

import type { Space } from '../data/schema';

export { isValidPib, normalizePib } from '@/utils/pib';

export type Business = { id: string; name: string; pib: string; archivedAt: string | null };

/** What the screens show: everything, Private only, or one business (by its id). */
export type View = 'all' | 'private' | (string & {});

export type Owned = { space: Space; businessId: string | null };

/**
 * The view to show for a saved choice. Nothing saved, or a business that is gone or archived, falls
 * back to All when there are businesses and to Private when there are none.
 */
export function resolveView(
  saved: string | null | undefined,
  businesses: readonly Business[],
): View {
  if (saved === 'all' || saved === 'private') return saved;
  const live = businesses.filter((business) => !business.archivedAt);
  if (saved && live.some((business) => business.id === saved)) return saved;
  return live.length > 0 ? 'all' : 'private';
}

/** Whether an entry (or rule) belongs in a view. */
export function inView(item: Owned, view: View): boolean {
  if (view === 'all') return true;
  if (view === 'private') return item.space === 'private';
  return item.space === 'business' && item.businessId === view;
}

/** `private` or a business id: the owner an entry is tagged with. */
export const ownerOf = (item: Owned): string =>
  item.space === 'private' ? 'private' : (item.businessId ?? '');

/** The category list an owner uses: businesses share one list, Private has its own. */
export const spaceOfOwner = (owner: string): Space =>
  owner === 'private' ? 'private' : 'business';

/** The owner a new entry starts with in a view (All starts as Private). */
export const ownerForView = (view: View): string => (view === 'all' ? 'private' : view);

/** A business name is shown, so a category from the other list gets its space in All. */
export const categoryLabel = (
  category: { emoji: string; name: string; space: Space },
  showSpace: boolean,
): string =>
  `${category.emoji} ${category.name}${showSpace && category.space === 'business' ? ' (Business)' : ''}`;
