import {
  allocate,
  currencies,
  formatMinor,
  formatWhole,
  minorToText,
  parseAmount,
  parseRate,
  toRsdMinor,
} from './amount';

describe('parseAmount', () => {
  it('reads whole and decimal amounts, with a comma or a dot', () => {
    expect(parseAmount('12')).toBe(1200);
    expect(parseAmount('12.5')).toBe(1250);
    expect(parseAmount('12,05')).toBe(1205);
    expect(parseAmount(' 0,99 ')).toBe(99);
  });

  it('refuses zero, negatives, too many decimals and junk', () => {
    for (const text of ['0', '0.00', '-5', '1.234', '', 'abc', '1,2,3', '1e5']) {
      expect(parseAmount(text)).toBeNull();
    }
  });

  it('refuses an amount beyond the limit', () => {
    expect(parseAmount('9999999999999')).toBeNull();
  });
});

describe('currencies', () => {
  it('offers the base currency first and no BAM', () => {
    expect(currencies[0]).toBe('RSD');
    expect(currencies).not.toContain('BAM');
  });
});

describe('formatMinor', () => {
  it('groups thousands and shows the currency', () => {
    expect(formatMinor(123450, 'EUR')).toBe('1,234.50 EUR');
    expect(formatMinor(5)).toBe('0 RSD');
    expect(formatMinor(123450)).toBe('1,235 RSD');
    expect(formatMinor(-100000)).toBe('−1,000 RSD');
    expect(formatWhole(-100000)).toBe('−1,000');
    expect(minorToText(1250)).toBe('12.50');
  });
});

describe('parseRate and toRsdMinor', () => {
  it('reads positive rates', () => {
    expect(parseRate('117,2')).toBe(117.2);
    expect(parseRate('117.1234')).toBe(117.1234);
    expect(parseRate('0')).toBeNull();
    expect(parseRate('-1')).toBeNull();
    expect(parseRate('1.1234567')).toBeNull();
  });

  it('converts to RSD, rounded to the nearest para', () => {
    expect(toRsdMinor(1000, 117.2)).toBe(117200);
    expect(toRsdMinor(333, 117.1234)).toBe(39002);
    expect(toRsdMinor(1000, 1)).toBe(1000);
  });
});

describe('allocate', () => {
  it('always adds up to the total', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(1000, [333, 333, 334]).reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('gives nothing when there is nothing to weigh', () => {
    expect(allocate(100, [0, 0])).toEqual([0, 0]);
    expect(allocate(100, [])).toEqual([]);
  });
});
