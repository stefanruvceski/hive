import { nbsUrl, parseNbsRate } from './fx';

const body = {
  rates: [
    { code: 'EUR', parity: 1, exchange_middle: 117.2 },
    { code: 'HUF', parity: 100, exchange_middle: 29.5 },
    { code: 'ATS', exchange_middle: 8.5 },
    { code: 'XXX', parity: 1 },
  ],
};

describe('nbsUrl', () => {
  it('asks for a past day by date and anything else for the latest', () => {
    expect(nbsUrl('2026-10-20')).toBe('https://kurs.resenje.org/api/v1/rates/2026-10-20');
    expect(nbsUrl(null)).toBe('https://kurs.resenje.org/api/v1/rates/today');
  });
});

describe('parseNbsRate', () => {
  it('reads the middle rate', () => {
    expect(parseNbsRate(body, 'EUR')).toBe(117.2);
  });

  it('divides by the parity', () => {
    expect(parseNbsRate(body, 'HUF')).toBeCloseTo(0.295);
  });

  it('treats a missing parity as 1', () => {
    expect(parseNbsRate(body, 'ATS')).toBe(8.5);
  });

  it('is null for an unlisted currency, a row without a middle rate or a bad body', () => {
    expect(parseNbsRate(body, 'USD')).toBeNull();
    expect(parseNbsRate(body, 'XXX')).toBeNull();
    expect(parseNbsRate({}, 'EUR')).toBeNull();
    expect(parseNbsRate(null, 'EUR')).toBeNull();
  });
});
