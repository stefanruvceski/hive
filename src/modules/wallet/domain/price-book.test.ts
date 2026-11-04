import { merge, pair, rename, unmerge } from './aliases';
import {
  displayName,
  type PriceReceipt,
  priceKey,
  pricePoints,
  products,
  searchProducts,
  suggestions,
} from './price-book';

// Ported from hive-poc PriceBookTest.kt. Prices are para (the Kotlin test used dinars).
type Line = [name: string, quantity: number, unitPrice: number, unit?: string];

const rec = (
  id: string,
  company: string,
  shop: string,
  date: string,
  lines: Line[],
  over: Partial<PriceReceipt> = {},
): PriceReceipt => ({
  id,
  status: 'ok',
  refund: false,
  company,
  shop,
  tin: null,
  time: `${date}T10:00:00`,
  addedAt: 1,
  items: lines.map(([name, quantity, unitPrice, unit]) => ({
    name,
    quantity,
    unitPrice,
    unit: unit ?? null,
  })),
  ...over,
});

const maxi = (id: string, date: string, lines: Line[]) =>
  rec(id, 'Delhaize Serbia doo', '1-Maxi', date, lines);

describe('price-book', () => {
  it('cleans names', () => {
    expect(displayName('EVRO PREMIJUM BMB-95,2710124500 /LIT (Ђ)')).toBe('EVRO PREMIJUM BMB-95');
    expect(displayName('Млеко 2,8% 1L /KOM (Е)')).toBe('MLEKO 2,8% 1L');
    expect(priceKey('JABUKA ZLATNI DELIŠES /KG')).toBe(priceKey('Јабука златни делишес'));
  });

  it('keys ignore the spacing of numbers', () => {
    expect(priceKey('MLEKO 2,8 % 1 L')).toBe(priceKey('Mleko 2.8% 1L'));
  });

  it('matches one product written two ways, keeping size and brand', () => {
    expect(priceKey('Dukat mleko 1,5L')).toBe('DUKAT MLEKO 1.5L');
    expect(priceKey('Dukat mleko 1,5L')).not.toBe(priceKey('Dukat mleko 1L'));
    expect(priceKey('Dukat mleko 1,5L')).not.toBe(priceKey('Imlek mleko 1,5L'));
  });

  it('groups by shop, not branch', () => {
    const rs = [
      rec('1', 'Delhaize Serbia doo', '101-Maxi Bulevar', '2026-10-01', [
        ['JABUKA /KG', 1.2, 12999, 'kg'],
      ]),
      rec('2', 'Delhaize Serbia doo', '202-Maxi Liman', '2026-10-10', [
        ['Јабука /KG', 1, 13999, 'kg'],
      ]),
      rec('3', 'Mercator-S doo', '303-Idea Centar', '2026-10-12', [['JABUKA /KG', 2, 11999, 'kg']]),
    ];
    const all = products(pricePoints(rs), []);
    expect(all).toHaveLength(1);
    const p = all[0];
    expect(p?.shops.map((s) => s.shop)).toEqual(['Idea', 'Maxi']);
    expect(p?.shops.find((s) => s.shop === 'Maxi')).toMatchObject({
      count: 2,
      last: 13999,
      min: 12999,
      avg: 13499,
    });
    expect(p?.history[0]?.date).toBe('2026-10-12');
    expect(p?.unit).toBe('KG');
  });

  it('skips pending, refund and zero-price lines', () => {
    const rs = [
      maxi('1', '2026-10-01', [
        ['HLEB', 1, 7000],
        ['FREE', 1, 0],
      ]),
      rec('2', 'Delhaize Serbia doo', 'x', '2026-10-02', [['HLEB', 1, 7500]], { refund: true }),
      rec('3', 'Delhaize Serbia doo', 'x', '2026-10-03', [['HLEB', 1, 7500]], {
        status: 'pending',
      }),
    ];
    expect(pricePoints(rs)).toHaveLength(1);
  });

  it('search forgives Serbian endings and scripts', () => {
    const ps = products(
      pricePoints([
        maxi('1', '2026-10-01', [
          ['JABUKA AJDARED /KG', 1, 9900],
          ['MLEKO 2,8% 1L', 1, 14900],
        ]),
      ]),
      [],
    );
    expect(searchProducts(ps, 'jabuke').map((p) => p.name)).toEqual(['JABUKA AJDARED']);
    expect(searchProducts(ps, 'Mleko').map((p) => p.name)).toEqual(['MLEKO 2,8% 1L']);
    expect(searchProducts(ps, 'banane')).toEqual([]);
    expect(searchProducts(ps, '')).toHaveLength(2);
  });

  it('merges by hand, keeps brands apart and remembers "not the same"', () => {
    const rs = [
      maxi('1', '2026-10-01', [['ZBREGOV MLEKO 1%', 1, 15900, 'kom']]),
      rec('2', 'Mercator-S doo', '2-Idea', '2026-10-02', [['ZBREGOV 1% MLEKO', 1, 14900, 'kom']]),
      maxi('3', '2026-10-03', [['MLEKO K PLUS 1%', 1, 9900, 'kom']]),
      maxi('4', '2026-10-04', [['ZBREGOV MLEKO 2.8%', 1, 16900, 'kom']]),
    ];
    const pts = pricePoints(rs);
    const all = products(pts, []);
    const a = all.find((p) => p.name === 'ZBREGOV MLEKO 1%');
    const b = all.find((p) => p.name === 'ZBREGOV 1% MLEKO');
    if (!a || !b) throw new Error('products missing');
    // Only the same brand and numbers: not K Plus, not 2.8%.
    expect(suggestions(a, all, []).map((p) => p.name)).toEqual(['ZBREGOV 1% MLEKO']);
    expect(suggestions(a, all, [pair(a.key, b.key)])).toEqual([]);

    let groups = merge([], a.key, b.key);
    const joined = products(pts, groups).find((p) => p.keys.includes(a.key));
    expect(joined?.count).toBe(2);
    expect(joined?.shops.map((s) => s.shop)).toEqual(['Idea', 'Maxi']);
    expect(joined?.aliases).toHaveLength(2);
    groups = rename(groups, joined?.key ?? '', 'Z Bregov mleko 1%');
    expect(products(pts, groups).find((p) => p.keys.includes(a.key))?.name).toBe(
      'Z Bregov mleko 1%',
    );
    expect(products(pts, unmerge(groups, b.key))).toHaveLength(4);
  });

  it('shops by company tax number, merged by hand', () => {
    const x = rec('1', 'Pekara Kod Mike', '1-Pekara Centar', '2026-10-01', [['HLEB', 1, 7000]], {
      tin: '101',
    });
    const y = rec('2', 'Pekara Kod Mike', '2-Pekara Liman', '2026-10-02', [['HLEB', 1, 7500]], {
      tin: '101',
    });
    const z = rec('3', 'Mikina pekara doo', '1-Pekara', '2026-10-03', [['HLEB', 1, 7200]], {
      tin: '202',
    });
    expect(products(pricePoints([x, y, z]), [])[0]?.shops).toHaveLength(2);
    const shops = rename(merge([], 'pib:101', 'pib:202'), 'pib:101', 'Kod Mike');
    const merged = products(pricePoints([x, y, z], shops), [])[0]?.shops;
    expect(merged?.map((s) => s.shop)).toEqual(['Kod Mike']);
    expect(merged?.[0]?.count).toBe(3);
  });
});
