import { ApiError, publicText } from '@/lib/api';

import { fetchFiscal } from './fiscal-client';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  publicText: jest.fn(),
}));
const mockedText = jest.mocked(publicText);
const url = 'https://suf.purs.gov.rs/v/?vl=X';

describe('fetchFiscal', () => {
  it('returns the body', async () => {
    mockedText.mockResolvedValue('{"isValid":true}');
    await expect(fetchFiscal(url)).resolves.toEqual({ kind: 'body', text: '{"isValid":true}' });
  });

  it('reports an error status from the office', async () => {
    mockedText.mockRejectedValue(new ApiError(404, 'x'));
    await expect(fetchFiscal(url)).resolves.toEqual({ kind: 'http', code: 404 });
  });

  it('reports no network instead of throwing', async () => {
    mockedText.mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchFiscal(url)).resolves.toEqual({ kind: 'offline' });
  });
});
