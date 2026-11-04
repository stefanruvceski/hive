import { merge, rename } from './aliases';
import { brandOf, shopKey, shopName, shopOf, shortCompany, shopTitle } from './shop-brands';

const r = (over: Partial<Parameters<typeof shopKey>[0]> = {}) => ({
  company: 'Pekara Kod Mike',
  shop: '1-Centar',
  tin: '101',
  ...over,
});

describe('shop-brands', () => {
  it('knows chains by company or shop name, in either script', () => {
    expect(brandOf('Delhaize Serbia doo', null)).toBe('Maxi');
    expect(brandOf('Mercator-S doo', '303-Idea Centar')).toBe('Idea');
    expect(brandOf('Друштво Нафтна индустрија Србије', null)).toBe('NIS');
    expect(brandOf('Pekara Kod Mike', 'Centar')).toBeNull();
  });

  it('cleans shop and company names', () => {
    expect(shopName('1037044-Bs Novi Sad 1')).toBe('Bs Novi Sad 1');
    expect(shopName('  ')).toBeNull();
    expect(shortCompany('Dexy Co Kids Doo', null)).toBe('Dexy Co Kids');
    expect(shopTitle({ company: null, shop: null })).toBe('Receipt');
  });

  it('files shops by company tax number, not branch', () => {
    expect(shopKey(r())).toBe('pib:101');
    expect(shopKey(r({ shop: '2-Liman' }))).toBe('pib:101');
    expect(shopKey(r({ company: 'Delhaize Serbia doo', tin: '5' }))).toBe('Maxi');
    expect(shopKey(r({ tin: null }))).toBe('Pekara Kod Mike');
  });

  it('applies hand merges and names on top', () => {
    expect(shopOf(r(), rename([], 'pib:101', 'Kod Mike'))).toEqual(['pib:101', 'Kod Mike']);
    const g = rename(merge([], 'pib:101', 'pib:202'), 'pib:101', 'Mike');
    expect(shopOf(r({ tin: '202' }), g)).toEqual(['pib:101', 'Mike']);
  });
});
