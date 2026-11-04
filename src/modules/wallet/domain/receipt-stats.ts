import type { AliasGroup } from './aliases';
import { latin } from './fiscal-parse';
import { shopOf } from './shop-brands';

// Totals, grouping and search for the Receipts tab (pure, unit tested). Ported from hive-poc
// ReceiptStats.kt. Money is in minor units (para); `time` is Belgrade local time.

export type StatsItem = { name: string; quantity: number; unitPrice: number; total: number };

export type StatsReceipt = {
  status: 'pending' | 'ok' | 'failed';
  /** Epoch milliseconds the receipt was scanned. */
  addedAt: number;
  time: string | null;
  total: number | null;
  shop: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  note: string;
  invoiceNumber: string | null;
  items: readonly StatsItem[];
};

export type Fuel = { liters: number; pricePerLiter: number; amount: number; name: string };

const FUEL =
  /\b(DIZEL|DIESEL|BENZIN|BMB|TNG|LPG|AUTOGAS|AUTO GAS|CNG|GORIVO|EVRO ?(DIZEL|PREMIUM|95|98|100)|EURO ?(DIESEL|95|98|100)|G-DRIVE|Q ?MAX|MAXXMOTION|ULTIMATE|V-POWER)\b/;

export const isFuel = (item: StatsItem) => FUEL.test((latin(item.name) ?? item.name).toUpperCase());

/** The fuel on a receipt (all fuel lines together), or null when there is none. */
export function fuel(r: Pick<StatsReceipt, 'items'>): Fuel | null {
  const lines = r.items.filter((i) => isFuel(i) && i.quantity > 0);
  if (lines.length === 0) return null;
  const liters = lines.reduce((sum, i) => sum + i.quantity, 0);
  const amount = lines.reduce((sum, i) => sum + i.total, 0);
  const biggest = lines.reduce((a, b) => (b.total > a.total ? b : a));
  return { liters, pricePerLiter: liters > 0 ? amount / liters : 0, amount, name: biggest.name };
}

const addedIso = (r: Pick<StatsReceipt, 'addedAt'>) =>
  new Date(r.addedAt).toISOString().slice(0, 19);
const sortKey = (r: StatsReceipt) => r.time ?? addedIso(r);

/** The day a receipt is for, `YYYY-MM-DD`. */
export const receiptDate = (r: StatsReceipt) => sortKey(r).slice(0, 10);

/** Newest first; receipts still waiting for their details sort by when they were scanned. */
export function sortReceipts<T extends StatsReceipt>(rs: readonly T[]): T[] {
  return [...rs].sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : sortKey(a) > sortKey(b) ? -1 : 0));
}

/** Money spent (refunds subtract), only receipts that were read. */
export const totalOf = (rs: readonly StatsReceipt[]) =>
  rs.filter((r) => r.status === 'ok').reduce((sum, r) => sum + (r.total ?? 0), 0);

export const litersOf = (rs: readonly StatsReceipt[]) =>
  rs.reduce((sum, r) => sum + (fuel(r)?.liters ?? 0), 0);

/** Receipts grouped by month (`YYYY-MM`), newest month first. */
export function byMonth<T extends StatsReceipt>(
  rs: readonly T[],
): { month: string; receipts: T[] }[] {
  const groups: { month: string; receipts: T[] }[] = [];
  for (const r of sortReceipts(rs)) {
    const month = receiptDate(r).slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.receipts.push(r);
    else groups.push({ month, receipts: [r] });
  }
  return groups;
}

/** The shop's name as people say it. */
export const titleOf = (r: Pick<StatsReceipt, 'shop' | 'company'>) =>
  r.shop ?? r.company ?? 'Receipt';

/** Free-text search over shop, company, address, items and note; Cyrillic input matches Latin text. */
export function searchReceipts<T extends StatsReceipt & { tin?: string | null }>(
  rs: readonly T[],
  query: string,
  groups: readonly AliasGroup[] = [],
): T[] {
  const q = (latin(query) ?? query).trim().toLowerCase();
  if (q === '') return [...rs];
  return rs.filter((r) =>
    [
      shopOf(r, groups)[1],
      titleOf(r),
      r.shop,
      r.company,
      r.address,
      r.city,
      r.note,
      r.invoiceNumber,
      ...r.items.map((i) => i.name),
    ].some((field) => field !== null && field.toLowerCase().includes(q)),
  );
}

/** "8.379,98" from minor units (Serbian grouping). */
export function formatAmount(minor: number): string {
  const negative = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${whole},${String(abs % 100).padStart(2, '0')}`;
}

/** "40,00 L" */
export const formatLiters = (liters: number) => `${formatAmount(Math.round(liters * 100))} L`;
