// What Wallet shows in Home's Today section: what the month's receipts add up to. Tested in
// home-summary.test.ts.

import type { HomeSummary } from '@/utils/home-summary';

import { formatAmount, type StatsReceipt } from './receipt-stats';

type SummaryReceipt = Pick<StatsReceipt, 'status' | 'total' | 'time' | 'addedAt'>;

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * The month's spending as the headline (the currency is a footnote), refunds subtracted, and how
 * many receipts it is made of under it. A prompt when the month has none yet.
 */
export function walletHomeSummary(
  receipts: readonly SummaryReceipt[],
  cards: number,
  today: string,
): HomeSummary {
  const month = today.slice(0, 7);
  const mine = receipts.filter(
    (r) => (r.time ?? new Date(r.addedAt).toISOString()).slice(0, 7) === month,
  );
  const read = mine.filter((r) => r.status === 'ok');
  const waiting = mine.filter((r) => r.status === 'pending').length;

  if (read.length === 0 && waiting === 0) {
    if (cards === 0 && receipts.length === 0) {
      return {
        kind: 'message',
        caption: 'This month',
        headline: 'Nothing yet',
        body: 'Tap to add a card or scan a receipt',
        label: 'no cards or receipts yet',
      };
    }
    return {
      kind: 'message',
      caption: 'This month',
      headline: 'No receipts',
      body:
        cards > 0 ? `${plural(cards, 'card')} · tap to scan a receipt` : 'Tap to scan a receipt',
      label: 'no receipts this month',
    };
  }

  const headline = formatAmount(read.reduce((sum, r) => sum + (r.total ?? 0), 0));
  const body = `${plural(read.length, 'receipt')}${waiting > 0 ? ` · ${waiting} waiting` : ''}`;
  return {
    kind: 'message',
    caption: 'This month',
    headline,
    body,
    footnote: 'RSD',
    label: `Receipts this month: ${headline} RSD, ${body}`,
  };
}
