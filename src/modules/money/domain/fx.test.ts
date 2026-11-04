import { failureText, nbsUrl, parseNbsPage, parseNbsRate } from './fx';

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

describe('parseNbsPage', () => {
  const page = `<table>
    <tr><th>Država</th><th>Oznaka</th><th>Važi za</th><th>Kupovni</th><th>Srednji</th><th>Prodajni</th></tr>
    <tr><td>EMU</td><td>EUR</td><td>1</td><td>116,90</td><td>117,2000</td><td>117,50</td></tr>
    <tr><td>Mađarska</td><td>HUF</td><td>100</td><td>29,10</td><td>29,5</td><td>29,90</td></tr>
  </table>`;

  it('reads the middle rate of the currency row', () => {
    expect(parseNbsPage(page, 'EUR')).toBe(117.2);
  });

  it('divides by the "valid for" amount', () => {
    expect(parseNbsPage(page, 'HUF')).toBeCloseTo(0.295);
  });

  it('is null for an unlisted currency or a page in another layout', () => {
    expect(parseNbsPage(page, 'USD')).toBeNull();
    expect(parseNbsPage('<html><body>Maintenance</body></html>', 'EUR')).toBeNull();
  });
});

describe('failureText', () => {
  it('names the cause in plain words', () => {
    expect(failureText('network', 'EUR', null)).toMatch(/no connection/);
    expect(failureText('status', 'EUR', 'HTTP 503')).toMatch(/error \(HTTP 503\)/);
    expect(failureText('shape', 'EUR', null)).toMatch(/format/);
    expect(failureText('unlisted', 'EUR', null)).toMatch(/no EUR rate/);
  });
});
