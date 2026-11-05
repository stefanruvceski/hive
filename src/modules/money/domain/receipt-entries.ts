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
  /** The shop's PIB and the company as printed; null on events from before they were sent. */
  shopPib: string | null;
  company: string | null;
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
  // Older events have no refund flag: a negative total is a refund.
  const refund = p.refund ?? p.total < 0;
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
      shopPib: p.shopPib ?? null,
      company: p.company ?? null,
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
// Fuel as a line is called (Money keeps its own rules; Wallet has its own).
const FUEL_ITEM =
  /\b(DIZEL|DIESEL|BENZIN|BMB|TNG|LPG|AUTO ?GAS|CNG|GORIVO|EVRO ?(DIZEL|PREMI\w+|\d{2,3})|EURO ?(DIESEL|\d{2,3})|PREMIJUM|G-DRIVE|V-POWER|MAXXMOTION|ULTIMATE)\b/i;
// Companies known by the shop's PIB (the first thing a receipt is matched on).
const KNOWN_PIBS: Readonly<Record<string, 'fuel' | 'grocery'>> = { '104052135': 'fuel' };

/** The name of the category a receipt's shop goes to in `space`; only chains Money knows get one. */
export function categoryNameFor(shop: string, space: Space): string {
  if (FUEL.test(shop)) return space === 'business' ? 'Fuel' : 'Transport';
  if (GROCERY.test(shop)) return space === 'business' ? 'Supplies' : 'Food';
  return 'Other';
}

/**
 * The category name for one receipt line: the shop's PIB first, then the shop or company name,
 * then what the line itself is (fuel on a receipt from a shop Money does not know).
 */
export function categoryNameForEntry(
  e: Pick<ReceiptEntry, 'shop' | 'shopPib' | 'company' | 'name'>,
  space: Space,
): string {
  const known = e.shopPib ? KNOWN_PIBS[e.shopPib] : undefined;
  const fuel = space === 'business' ? 'Fuel' : 'Transport';
  const food = space === 'business' ? 'Supplies' : 'Food';
  if (known === 'fuel') return fuel;
  if (known === 'grocery') return food;
  const byShop = categoryNameFor(`${e.company ?? ''} ${e.shop}`, space);
  if (byShop !== 'Other') return byShop;
  return FUEL_ITEM.test(e.name) ? fuel : 'Other';
}
