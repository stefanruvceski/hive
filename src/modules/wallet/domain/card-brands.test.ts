import {
  shortName,
  suggestBrands,
  cardLook,
  initialsOf,
  findBrand,
  hex,
  maskedNumber,
  shade,
} from './card-brands';

describe('findBrand', () => {
  it('knows a program by its name, in any case', () => {
    expect(findBrand('superkartica')?.name).toBe('SuperKartica');
    expect(findBrand('Lidl Plus')?.light).toBe(true);
  });

  it('reads Cyrillic names', () => {
    expect(findBrand('Јанковић апотека')?.name).toBe('Apoteka Janković');
  });

  it('matches whole words only', () => {
    expect(findBrand('Maximus')).toBeNull();
    expect(findBrand('Moj Maxi')?.name).toBe('Moj Maxi');
  });

  it('knows nothing about an unknown or empty name', () => {
    expect(findBrand('My gym')).toBeNull();
    expect(findBrand('  ')).toBeNull();
  });
});

describe('colors', () => {
  it('writes and darkens colors', () => {
    expect(hex(0x1d3fd6)).toBe(`#${'1d3fd6'}`);
    expect(hex(0x0000ff)).toBe(`#${'0000ff'}`);
    expect(shade(0xffffff, 0.5)).toBe(0x808080);
    expect(shade(0x123456, 0)).toBe(0x123456);
  });
});

describe('cardLook', () => {
  it('uses the program look, with light cards getting dark ink', () => {
    expect(cardLook('Lidl', hex(0x2563eb))).toMatchObject({
      from: hex(0xf4f6fa),
      ink: hex(0x1c1c1e),
    });
    expect(cardLook('Ikea', hex(0x2563eb))).toMatchObject({
      from: hex(0x0058a3),
      style: 'stripes',
    });
  });

  it('falls back to a plain gradient of the chosen color', () => {
    expect(cardLook('My gym', hex(0x336699))).toEqual({
      brand: null,
      from: hex(0x336699),
      to: hex(0x24476b),
      ink: hex(0xffffff),
      style: 'plain',
    });
  });

  it('darkens a one-color program for its second stop', () => {
    const look = cardLook('Terranova', hex(0));
    expect(look.to).not.toBe(look.from);
  });
});

describe('maskedNumber', () => {
  it('keeps the last four digits', () => {
    expect(maskedNumber('9876543210')).toBe('•••• 3210');
    expect(maskedNumber('1234')).toBe('');
  });
});

describe('initialsOf', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOf('Lidl Plus')).toBe('LP');
    expect(initialsOf('idea')).toBe('I');
    expect(initialsOf('Moj Maxi kartica')).toBe('MM');
  });

  it('reads Cyrillic and ignores punctuation', () => {
    expect(initialsOf('Јанковић апотека')).toBe('JA');
    expect(initialsOf('  --  ')).toBe('');
  });
});

describe('suggestBrands', () => {
  it('offers programs matching what is typed', () => {
    expect(suggestBrands('ide').map((b) => b.name)).toContain('Idea');
    expect(suggestBrands('lidl')[0]?.name).toBe('Lidl Plus');
    expect(suggestBrands('Ј')).toEqual([]);
  });

  it('offers nothing for one letter or an unknown name, and caps the list', () => {
    expect(suggestBrands('i')).toEqual([]);
    expect(suggestBrands('zzzz')).toEqual([]);
    expect(suggestBrands('ar', 3).length).toBeLessThanOrEqual(3);
  });
});

describe('shortName', () => {
  it('keeps the first two words', () => {
    expect(shortName('Metro klub prijatelja')).toBe('Metro klub');
    expect(shortName('  Lidl   Plus ')).toBe('Lidl Plus');
    expect(shortName('Idea')).toBe('Idea');
    expect(shortName('')).toBe('');
  });
});
