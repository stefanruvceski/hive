import { useBusinesses } from '../../data/business-queries';
import { useActiveView, useSetView } from '../../data/queries';
import type { Space } from '../../data/schema';
import { type Business, resolveView, type View } from '../../domain/owners';

/**
 * The view the screens show (All, Private or one business) and the businesses it can name. Pass
 * `queries` to `Gate`; `categorySpaces` are the category lists the view uses.
 */
export function useMoneyView() {
  const saved = useActiveView();
  const businesses = useBusinesses();
  const setView = useSetView();
  const list: Business[] = businesses.data ?? [];
  const view: View = resolveView(saved.data, list);
  const categorySpaces: Space[] =
    view === 'all' ? ['private', 'business'] : view === 'private' ? ['private'] : ['business'];
  return {
    queries: [saved, businesses],
    view,
    businesses: list,
    live: list.filter((business) => !business.archivedAt),
    categorySpaces,
    setView: setView.mutate,
  };
}
