// Pure Money logic: what a Wallet receipt event turns into (one expense per item) and how an update
// is applied to the entries already made. The database part is data/receipt-import.ts.
// Tested in receipt-entries.test.ts.

import type { HiveEvent } from '@/lib/events';

import type { Space } from '../data/schema';

/** One Money entry wanted for a receipt line. Amounts are para (RSD minor units). */
export type ReceiptEntry = {
  sourceRef: string;
  /** Negative for a refund. */
  amountMinor: number;
  /** `YYYY-MM-DD`. */
  date: string;
  note: string;
  /** The business the receipt is for; null = Private. */
  pib: string | null;
  shop: string;
  /** The item's printed name. */
  name: string;
};

export type ReceiptPlan = { receiptId: string; entries: ReceiptEntry[] };

export const sourceRefOf = (receiptId: string, line: number) => `wallet:${receiptId}:${line}`;

/** The receipt an entry was made from, or null when it was not made from one. */
export function receiptIdOf(sourceRef: string | null): string | null {
  const match = /^wallet:(.+):\d+$/.exec(sourceRef ?? '');
  return match?.[1] ?? null;
}

/** What the entries of a receipt event should be: all of its lines, or none after a delete. */
export function planEvent(event: HiveEvent): ReceiptPlan {
  if (event.type === 'receipt.deleted') return { receiptId: event.payload.receiptId, entries: [] };
  const p = event.payload;
  const refund = p.total < 0;
  return {
    receiptId: p.receiptId,
    entries: p.items.map((item, line) => ({
      sourceRef: sourceRefOf(p.receiptId, line),
      amountMinor: refund ? -Math.abs(item.total) : item.total,
      date: p.issuedAt.slice(0, 10),
      note: p.shop,
      pib: p.pib,
      shop: p.shop,
      name: item.name,
    })),
  };
}

/** What to write so the existing entries match `wanted`: every wanted line, and drop the rest. */
export function reconcile(
  existing: readonly { id: string; sourceRef: string | null }[],
  wanted: readonly ReceiptEntry[],
): { upsert: ReceiptEntry[]; remove: string[] } {
  const keep = new Set(wanted.map((e) => e.sourceRef));
  return {
    upsert: [...wanted],
    remove: existing.filter((e) => !e.sourceRef || !keep.has(e.sourceRef)).map((e) => e.id),
  };
}

const FUEL = /\b(NIS|NAFTNA|LUKOIL|OMV|MOL|CORAL|GAZPROM|EKO)\b/i;
const GROCERY = /\b(LIDL|MAXI|DELHAIZE|IDEA|MERCATOR|RODA|UNIVEREXPORT|TEMPO|METRO|AMAN)\b/i;

/** The name of the category a receipt's shop goes to in `space`; only chains Money knows get one. */
export function categoryNameFor(shop: string, space: Space): string {
  if (FUEL.test(shop)) return space === 'business' ? 'Fuel' : 'Transport';
  if (GROCERY.test(shop)) return space === 'business' ? 'Supplies' : 'Food';
  return 'Other';
}
