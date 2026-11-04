import { type AliasGroup, canonical, groupOf, pair } from './aliases';
import { latin } from './fiscal-parse';
import type { StatsReceipt } from './receipt-stats';
import { shopOf } from './shop-brands';

// Prices of everything on the receipts. Ported from hive-poc PriceBook.kt (pure, tested in
// price-book.test.ts). Items are matched by a normalized name (Latin, no diacritics, no item codes
// or unit suffixes, size and unit kept); different brands stay different products. Spellings of one
// product are only joined by hand (aliases); `suggestions` proposes, it never merges.

/** A receipt as the price book reads it. Money is para. */
export type PriceReceipt = Pick<
  StatsReceipt,
  'status' | 'addedAt' | 'time' | 'company' | 'shop'
> & {
  id: string;
  refund: boolean;
  tin: string | null;
  items: readonly { name: string; quantity: number; unitPrice: number; unit: string | null }[];
};

/** One item bought: what, in which shop (company, not branch), when and for how much per unit. */
export type PricePoint = {
  key: string;
  name: string;
  shopKey: string;
  shop: string;
  /** `YYYY-MM-DD`. */
  date: string;
  unitPrice: number;
  unit: string | null;
  receiptId: string;
};

/** One shop's prices for a product (para). */
export type ShopPrice = {
  shopKey: string;
  shop: string;
  last: number;
  lastDate: string;
  min: number;
  avg: number;
  count: number;
};

/**
 * A product across every receipt. `key` is the one it is filed under, `keys` every spelling merged
 * into it, `aliases` the names it was printed as (most used first); `name` is the user's choice or
 * the most used one.
 */
export type Product = {
  key: string;
  keys: string[];
  name: string;
  named: boolean;
  aliases: string[];
  unit: string | null;
  /** Cheapest last price first. */
  shops: ShopPrice[];
  /** Newest first. */
  history: PricePoint[];
  count: number;
};

const CODE = /[,;]\s*\d{5,}\b|\b\d{8,}\b/g; // ",2710124500", GTINs
const UNIT_SUFFIX = /\s*\/\s*(KOM|KG|L|LIT|G|M|PAK|KUT)\b.*$/;
const VAT_MARK = /\s*\(\s*[A-ZĐŽČĆŠ]\s*\)\s*$/;
const SPACES = /\s+/g;

const fold = (s: string) =>
  s.replace(/Đ/g, 'D').replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]+/g, '');

/** "EVRO PREMIJUM BMB-95,2710124500 /LIT (Ђ)" → "EVRO PREMIJUM BMB-95". */
export function displayName(raw: string): string {
  let s = (latin(raw) ?? raw).toUpperCase();
  s = s.replace(VAT_MARK, '').replace(UNIT_SUFFIX, '').replace(CODE, ' ');
  return s
    .replace(SPACES, ' ')
    .trim()
    .replace(/^[,\- ]+|[,\- ]+$/g, '');
}

/** The matching key: `displayName` without diacritics or punctuation, "2,8 %" = "2.8%", "1 L" = "1L". */
export function priceKey(raw: string): string {
  let s = fold(displayName(raw));
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/[^A-Z0-9%.]/g, ' ');
  s = s.replace(/(\d)\s+(%|L|ML|G|KG|KOM)(?![A-Z0-9])/g, '$1$2');
  return s.replace(SPACES, ' ').trim();
}

/** Every priced line of the finished, non-refund receipts. */
export function pricePoints(
  receipts: readonly PriceReceipt[],
  shopGroups: readonly AliasGroup[] = [],
): PricePoint[] {
  return receipts
    .filter((r) => r.status === 'ok' && !r.refund)
    .flatMap((r) => {
      const date = (r.time ?? new Date(r.addedAt).toISOString()).slice(0, 10);
      const [shopKey, shop] = shopOf(r, shopGroups);
      return r.items
        .filter((i) => i.unitPrice > 0 && i.name.trim() !== '')
        .map((i) => ({
          key: priceKey(i.name),
          name: displayName(i.name),
          shopKey,
          shop,
          date,
          unitPrice: i.unitPrice,
          unit: i.unit?.toUpperCase() ?? null,
          receiptId: r.id,
        }));
    });
}

function groupBy<T>(xs: readonly T[], by: (x: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const x of xs) {
    const k = by(x);
    out.set(k, [...(out.get(k) ?? []), x]);
  }
  return out;
}

/** Distinct values, most frequent first (ties keep first-seen order). */
function mostUsed(xs: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([x]) => x);
}

/** Every product (hand merges applied), the most bought first, then the most recent. */
export function products(points: readonly PricePoint[], groups: readonly AliasGroup[]): Product[] {
  const byKey = groupBy(
    points.filter((p) => p.key !== ''),
    (p) => canonical(groups, p.key),
  );
  const out: Product[] = [];
  for (const [key, ps] of byKey) {
    const history = [...ps].sort((a, b) => b.date.localeCompare(a.date));
    const shops: ShopPrice[] = [...groupBy(ps, (p) => p.shopKey).entries()].map(([shopKey, cs]) => {
      const newest = cs.reduce((a, b) => (b.date > a.date ? b : a));
      const sum = cs.reduce((n, c) => n + c.unitPrice, 0);
      return {
        shopKey,
        shop: mostUsed(cs.map((c) => c.shop))[0] ?? shopKey,
        last: newest.unitPrice,
        lastDate: newest.date,
        min: Math.min(...cs.map((c) => c.unitPrice)),
        avg: Math.round(sum / cs.length),
        count: cs.length,
      };
    });
    shops.sort((a, b) => a.last - b.last);
    const aliases = mostUsed(ps.map((p) => p.name));
    const chosen = groupOf(groups, key)?.name ?? null;
    out.push({
      key,
      keys: [...new Set(ps.map((p) => p.key))],
      name: chosen ?? aliases[0] ?? key,
      named: chosen !== null,
      aliases,
      unit: history.find((p) => p.unit !== null)?.unit ?? null,
      shops,
      history,
      count: history.length,
    });
  }
  return out.sort(
    (a, b) =>
      b.count - a.count || (b.history[0]?.date ?? '').localeCompare(a.history[0]?.date ?? ''),
  );
}

/**
 * Search that forgives Serbian endings and scripts: every word of the query must start a word of one
 * of the product's names, matching on its first letters ("jabuke" → JABU… finds "JABUKA").
 */
export function searchProducts(all: readonly Product[], query: string): Product[] {
  const words = priceKey(query)
    .split(' ')
    .filter((w) => w !== '');
  if (words.length === 0) return [...all];
  const stems = words.map((w) => (w.length > 4 ? w.slice(0, w.length - 2).slice(0, 6) : w));
  return all.filter((p) => {
    const names = [...p.keys, priceKey(p.name)].flatMap((k) => k.split(' '));
    return stems.every((s) => names.some((n) => n.startsWith(s)));
  });
}

const tokens = (k: string) => k.split(' ').filter((t) => t !== '');
const numbers = (k: string) => new Set(tokens(k).filter((t) => /\d/.test(t)));
const wordsOf = (k: string) => tokens(k).filter((t) => !/\d/.test(t) && t.length > 1);
const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

/** Letter trigrams of each word and of each pair of neighbours joined ("Z BREGOV" ~ "ZBREGOV"). */
function grams(k: string): Set<string> {
  const ws = tokens(k).filter((t) => !/\d/.test(t));
  const parts = [...ws, ...ws.slice(1).map((w, i) => (ws[i] ?? '') + w)];
  const out = new Set<string>();
  for (const w of parts) {
    if (w.length < 3) out.add(w);
    else for (let i = 0; i + 3 <= w.length; i++) out.add(w.slice(i, i + 3));
  }
  return out;
}

function similarity(a: string, b: string): number {
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let shared = 0;
  for (const g of ga) if (gb.has(g)) shared += 1;
  return (2 * shared) / (ga.size + gb.size);
}

/**
 * Products that may be `p` spelled differently: exactly the same numbers (2.8%, 1L…) and nearly the
 * same words, so another brand (K PLUS vs Z BREGOV) or size never shows up. Pairs in `notSame` are
 * skipped. Best first.
 */
export function suggestions(
  p: Product,
  all: readonly Product[],
  notSame: readonly string[],
  limit = 3,
): Product[] {
  const scored: [Product, number][] = [];
  for (const o of all) {
    if (o.key === p.key || o.keys.some((k) => p.keys.includes(k))) continue;
    if (p.keys.some((a) => o.keys.some((b) => notSame.includes(pair(a, b))))) continue;
    let best = 0;
    for (const a of p.keys)
      for (const b of o.keys)
        if (sameSet(numbers(a), numbers(b)) && wordsOf(a).length > 0)
          best = Math.max(best, similarity(a, b));
    if (best >= 0.6) scored.push([o, best]);
  }
  return scored
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([o]) => o);
}
