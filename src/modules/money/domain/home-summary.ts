// What Money shows in Home's Today section: the balance and spending of the month. Tested in home-summary.test.ts.

import type { HomeSummary } from '@/utils/home-summary';

import { formatWhole } from './amount';
import { type BudgetRow, effectiveLimit } from './budgets';
import { monthOf } from './dates';
import { type EntryLike, type ItemLike, spendingByCategory, totalsOf } from './entries';
import { type Business, inView, type Owned, type View } from './owners';

type SummaryEntry = EntryLike & Owned;
type SummaryCategory = { id: string; space: 'private' | 'business'; kind: string };

/**
 * The month's balance as the headline (the currency is a footnote), what was spent under it, and a
 * ring: how much of the month's budgets is used, or, with no budgets, how much of the income was
 * spent. A prompt when nothing is in yet.
 */
export function moneyHomeSummary(
  entries: readonly SummaryEntry[],
  items: readonly ItemLike[],
  categories: readonly SummaryCategory[],
  budgets: readonly BudgetRow[],
  businesses: readonly Pick<Business, 'id' | 'name'>[],
  view: View,
  today: string,
): HomeSummary {
  const month = monthOf(today);
  const mine = entries.filter((entry) => inView(entry, view) && monthOf(entry.date) === month);
  const viewName =
    view === 'all'
      ? 'All'
      : view === 'private'
        ? 'Private'
        : (businesses.find((business) => business.id === view)?.name ?? 'Business');
  if (mine.length === 0) {
    return {
      kind: 'message',
      caption: viewName,
      headline: 'Nothing this month',
      body: 'Tap to add an entry',
      label: 'no entries this month',
    };
  }
  const totals = totalsOf(mine);
  const headline = formatWhole(totals.balance);
  const body = `${formatWhole(totals.expense)} spent`;

  const spent = spendingByCategory(mine, items);
  let limit = 0;
  let used = 0;
  for (const category of categories) {
    if (category.kind !== 'expense') continue;
    if (
      view === 'private'
        ? category.space !== 'private'
        : view !== 'all' && category.space !== 'business'
    )
      continue;
    const cap = effectiveLimit(budgets, category.id, month);
    if (cap === null) continue;
    limit += cap;
    used += spent.get(category.id) ?? 0;
  }
  const ring =
    limit > 0
      ? { share: used / limit, what: 'of budget used' }
      : totals.income > 0
        ? { share: totals.expense / totals.income, what: 'of income spent' }
        : null;
  const percent = ring ? `${Math.round(ring.share * 100)}%` : null;

  return {
    kind: 'message',
    caption: viewName,
    headline,
    body,
    footnote: 'RSD',
    ring: ring && percent ? { share: ring.share, text: percent } : undefined,
    label: `Balance this month, ${viewName}: ${headline} RSD, ${body}${ring ? `, ${percent} ${ring.what}` : ''}`,
  };
}
