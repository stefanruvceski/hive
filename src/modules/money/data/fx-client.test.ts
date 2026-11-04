import { publicJson } from '@/lib/api';

import { fetchNbsRate } from './fx-client';

jest.mock('@/lib/api', () => ({ publicJson: jest.fn() }));

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
