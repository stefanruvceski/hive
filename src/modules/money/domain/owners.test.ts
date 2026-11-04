import {
  type Business,
  categoryLabel,
  inView,
  isValidPib,
  normalizePib,
  ownerForView,
  ownerOf,
  resolveView,
  spaceOfOwner,
} from './owners';

const shop: Business = { id: 'b1', name: 'Shop', pib: '101134702', archivedAt: null };
const old: Business = { id: 'b2', name: 'Old', pib: '100002887', archivedAt: '2026-10-01' };

describe('resolveView', () => {
  it('keeps All and Private', () => {
    expect(resolveView('all', [])).toBe('all');
    expect(resolveView('private', [shop])).toBe('private');
  });

  it('keeps a live business', () => {
    expect(resolveView('b1', [shop])).toBe('b1');
  });

  it('falls back to All with businesses and Private without', () => {
    expect(resolveView(null, [shop])).toBe('all');
    expect(resolveView('gone', [shop])).toBe('all');
    expect(resolveView('b2', [shop, old])).toBe('all');
    expect(resolveView(undefined, [])).toBe('private');
    expect(resolveView('business', [])).toBe('private');
  });
});

describe('inView', () => {
  const mine = { space: 'private', businessId: null } as const;
  const firm = { space: 'business', businessId: 'b1' } as const;

  it('shows everything in All', () => {
    expect(inView(mine, 'all') && inView(firm, 'all')).toBe(true);
  });

  it('separates Private from each business', () => {
    expect(inView(mine, 'private')).toBe(true);
    expect(inView(firm, 'private')).toBe(false);
    expect(inView(firm, 'b1')).toBe(true);
    expect(inView(firm, 'b2')).toBe(false);
    expect(inView(mine, 'b1')).toBe(false);
  });
});

describe('owners', () => {
  it('names the owner of an entry', () => {
    expect(ownerOf({ space: 'private', businessId: null })).toBe('private');
    expect(ownerOf({ space: 'business', businessId: 'b1' })).toBe('b1');
  });

  it('maps an owner to its category list and a view to a starting owner', () => {
    expect(spaceOfOwner('private')).toBe('private');
    expect(spaceOfOwner('b1')).toBe('business');
    expect(ownerForView('all')).toBe('private');
    expect(ownerForView('b1')).toBe('b1');
  });
});

describe('PIB', () => {
  it('accepts a number with a right check digit', () => {
    expect(isValidPib('101134702')).toBe(true);
    expect(isValidPib('100002887')).toBe(true);
  });

  it('rejects a wrong check digit, wrong length or letters', () => {
    expect(isValidPib('101134703')).toBe(false);
    expect(isValidPib('10113470')).toBe(false);
    expect(isValidPib('10113470a')).toBe(false);
  });

  it('normalizes spaces and dashes, and refuses anything but nine digits', () => {
    expect(normalizePib('101 134 702')).toBe('101134702');
    expect(normalizePib('101-134-702')).toBe('101134702');
    expect(normalizePib('1011347')).toBeNull();
    expect(normalizePib('RS101134702')).toBeNull();
  });
});

describe('categoryLabel', () => {
  it('marks a business category only when asked to', () => {
    const fuel = { emoji: '⛽', name: 'Fuel', space: 'business' } as const;
    expect(categoryLabel(fuel, false)).toBe('⛽ Fuel');
    expect(categoryLabel(fuel, true)).toBe('⛽ Fuel (Business)');
    expect(categoryLabel({ emoji: '🛒', name: 'Food', space: 'private' }, true)).toBe('🛒 Food');
  });
});
