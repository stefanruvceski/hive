import { type AliasGroup, canonical, groupOf } from './aliases';
import { latin } from './fiscal-parse';

// Shops by company, not branch. Ported from hive-poc Brands.kt / Chains (names only; the
// colours, logos and categories stay in the Kotlin PoC until a screen needs them).

type ShopLike = { company: string | null; shop: string | null };

const RULES: readonly (readonly [RegExp, string])[] = [
  [/NAFTNA INDUSTRIJA SRBIJE|\bNIS\b|NIS PETROL/, 'NIS'],
  [/LUKOIL/, 'Lukoil'],
  [/\bOMV\b/, 'OMV'],
  [/\bMOL\b/, 'MOL'],
  [/\bCORAL\b/, 'Coral'],
  [/GAZPROM/, 'Gazprom'],
  [/\bEKO SERBIA\b|\bEKO\b/, 'EKO'],
  [/\bLIDL\b/, 'Lidl'],
  [/\bMAXI\b|DELHAIZE/, 'Maxi'],
  [/\bIDEA\b|MERCATOR/, 'Idea'],
  [/\bRODA\b/, 'Roda'],
  [/UNIVEREXPORT/, 'Univerexport'],
  [/\bTEMPO\b/, 'Tempo'],
  [/METRO CASH|\bMETRO\b/, 'Metro'],
  [/\bAMAN\b/, 'Aman'],
  [/GIGATRON/, 'Gigatron'],
  [/TEHNOMANIJA/, 'Tehnomanija'],
  [/DR TECHNO/, 'Dr Techno'],
  [/WIN ?WIN/, 'WinWin'],
  [/\bJYSK\b/, 'JYSK'],
  [/\bIKEA\b/, 'IKEA'],
  [/DECATHLON/, 'Decathlon'],
  [/SPORT ?VISION/, 'Sport Vision'],
  [/DEICHMANN/, 'Deichmann'],
  [/\bDM\b|DM-DROGERIE/, 'dm'],
  [/\bLILLY\b/, 'Lilly'],
  [/\bBENU\b/, 'Benu'],
  [/PET CENTAR/, 'Pet Centar'],
  [/\bLAGUNA\b/, 'Laguna'],
  [/MC ?DONALD/, "McDonald's"],
  [/\bKFC\b/, 'KFC'],
];

const up = (s: string | null | undefined) => (latin(s) ?? '').toUpperCase();

/** The chain behind a company or shop name, or null. */
export function brandOf(company: string | null, shop: string | null): string | null {
  for (const text of [company, shop]) {
    const t = up(text);
    if (t === '') continue;
    const hit = RULES.find(([re]) => re.test(t));
    if (hit) return hit[1];
  }
  return null;
}

/** "1037044-Bs Novi Sad 1" → "Bs Novi Sad 1" (the tax office's shop code dropped). */
export const shopName = (shop: string | null): string | null =>
  shop?.replace(/^\d+\s*-\s*/, '').trim() || null;

const LEGAL =
  /\b(D\.?\s?O\.?\s?O\.?|A\.?\s?D\.?|K\.?\s?D\.?|PR|EXPORT-IMPORT|DRU[ŠS]TVO SA OGRANI[ČC]ENOM ODGOVORNO[ŠS][ĆC]U)\b\.?/gi;

/** A readable company name: before the first comma, legal forms dropped; long names fall back to the shop. */
export function shortCompany(company: string | null, shop: string | null): string | null {
  const c = company
    ?.split(',')[0]
    ?.replace(LEGAL, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[- ]+|[- ]+$/g, '');
  const long = c === undefined || c.length > 32 || /^(DRU[ŠS]TVO|PREDUZE[ĆC]E|PRIVREDNO)/i.test(c);
  return long ? (shopName(shop) ?? c ?? null) : c || null;
}

/** What to call a shop in lists: the chain ("NIS"), else a short company name, else the branch. */
export const shopTitle = (r: ShopLike): string =>
  brandOf(r.company, r.shop) ?? shortCompany(r.company, r.shop) ?? shopName(r.shop) ?? 'Receipt';

/** The shop key: a known chain by its name, anyone else by tax number (same at every branch). */
export const shopKey = (r: ShopLike & { tin: string | null }): string =>
  brandOf(r.company, r.shop) ?? (r.tin?.trim() ? `pib:${r.tin.trim()}` : shopTitle(r));

/** `[key, name]` of a receipt's shop with the user's merges and names applied. */
export function shopOf(
  r: ShopLike & { tin: string | null },
  groups: readonly AliasGroup[],
): [string, string] {
  const key = canonical(groups, shopKey(r));
  return [key, groupOf(groups, key)?.name ?? shopTitle(r)];
}
