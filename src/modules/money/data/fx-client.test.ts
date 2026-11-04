import { ApiError, publicJson, publicText } from '@/lib/api';

import { fetchNbsRate, getNbsRate } from './fx-client';

jest.mock('@/lib/api', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  publicJson: jest.fn(),
  publicText: jest.fn(),
}));

const body = { rates: [{ code: 'EUR', parity: 1, exchange_middle: 117.2 }] };

beforeEach(() => jest.clearAllMocks());

describe('fetchNbsRate', () => {
  it('asks for a past day by its date', async () => {
    jest.mocked(publicJson).mockResolvedValue(body);
    await expect(fetchNbsRate('EUR', '2026-10-20', '2026-11-04')).resolves.toBe(117.2);
    expect(publicJson).toHaveBeenCalledWith(
      'https://kurs.resenje.org/api/v1/rates/2026-10-20',
      10_000,
    );
  });

  it('asks for the latest list for today or later', async () => {
    jest.mocked(publicJson).mockResolvedValue(body);
    await fetchNbsRate('EUR', '2026-11-04', '2026-11-04');
    expect(publicJson).toHaveBeenCalledWith('https://kurs.resenje.org/api/v1/rates/today', 10_000);
  });

  it('is null when the call fails or the currency is not listed', async () => {
    jest.mocked(publicJson).mockRejectedValueOnce(new Error('offline'));
    await expect(fetchNbsRate('EUR', '2026-10-20', '2026-11-04')).resolves.toBeNull();
    jest.mocked(publicJson).mockResolvedValueOnce(body);
    await expect(fetchNbsRate('USD', '2026-10-20', '2026-11-04')).resolves.toBeNull();
  });
});

describe('getNbsRate: why a rate is missing', () => {
  const page = `<table><tr><td>Evro</td><td>EUR</td><td>1</td><td>116,9</td><td>117,2000</td><td>117,5</td></tr>
    <tr><td>Forinta</td><td>HUF</td><td>100</td><td>29,1</td><td>29,5</td><td>29,9</td></tr></table>`;
  const today = '2026-11-04';

  it('says network when the call cannot be made', async () => {
    jest.mocked(publicJson).mockRejectedValue(new TypeError('Network request failed'));
    jest.mocked(publicText).mockRejectedValue(new TypeError('Network request failed'));
    await expect(getNbsRate('EUR', '2026-10-20', today)).resolves.toMatchObject({
      rate: null,
      failure: 'network',
    });
  });

  it('says status, with the code, when the service answers with an error', async () => {
    jest.mocked(publicJson).mockRejectedValue(new ApiError(503, 'x'));
    await expect(getNbsRate('EUR', '2026-10-20', today)).resolves.toMatchObject({
      failure: 'status',
      detail: 'HTTP 503',
    });
  });

  it('says shape when the answer is not a list of rates', async () => {
    jest.mocked(publicJson).mockResolvedValue({ error: 'moved' });
    await expect(getNbsRate('EUR', '2026-10-20', today)).resolves.toMatchObject({
      failure: 'shape',
    });
  });

  it('says unlisted when the list has no such currency, and does not try the page', async () => {
    jest.mocked(publicJson).mockResolvedValue(body);
    await expect(getNbsRate('USD', today, today)).resolves.toMatchObject({ failure: 'unlisted' });
    expect(publicText).not.toHaveBeenCalled();
  });

  it('falls back to the NBS page for today when the mirror is down', async () => {
    jest.mocked(publicJson).mockRejectedValue(new ApiError(500, 'x'));
    jest.mocked(publicText).mockResolvedValue(page);
    await expect(getNbsRate('EUR', today, today)).resolves.toEqual({
      rate: 117.2,
      source: 'nbs',
      failure: null,
      detail: null,
    });
    expect(await fetchNbsRate('HUF', today, today)).toBeCloseTo(0.295);
  });

  it('does not use the page for a past day, which it cannot answer', async () => {
    jest.mocked(publicJson).mockRejectedValue(new ApiError(500, 'x'));
    await expect(getNbsRate('EUR', '2026-10-20', today)).resolves.toMatchObject({
      failure: 'status',
    });
    expect(publicText).not.toHaveBeenCalled();
  });

  it('reports the mirror cause when the page fails too', async () => {
    jest.mocked(publicJson).mockRejectedValue(new ApiError(502, 'x'));
    jest.mocked(publicText).mockResolvedValue('<html>new layout</html>');
    await expect(getNbsRate('EUR', today, today)).resolves.toMatchObject({
      rate: null,
      failure: 'status',
      detail: 'HTTP 502',
    });
  });
});
