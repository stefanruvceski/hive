import {
  api,
  ApiError,
  ApiNotConfiguredError,
  isApiConfigured,
  publicJson,
  publicText,
} from './api';

// No API URL, as in an EAS Update bundle (#18).
jest.mock('./env', () => ({ env: { apiUrl: undefined } }));

describe('api without an API URL', () => {
  it('reports that remote calls are unavailable', () => {
    expect(isApiConfigured()).toBe(false);
  });

  it('rejects with ApiNotConfiguredError instead of fetching', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await expect(api('/api/health')).rejects.toBeInstanceOf(ApiNotConfiguredError);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('publicJson', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the parsed body', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) } as Response);
    await expect(publicJson('https://example.test/x')).resolves.toEqual({ a: 1 });
  });

  it('rejects with ApiError on a bad status', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    await expect(publicJson('https://example.test/x')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('publicText', () => {
  afterEach(() => jest.restoreAllMocks());

  it('asks for JSON and returns the body as text', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, text: async () => '<html></html>' } as Response);
    await expect(publicText('https://example.test/x')).resolves.toBe('<html></html>');
    expect(spy).toHaveBeenCalledWith(
      'https://example.test/x',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('rejects with ApiError on a bad status', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);
    await expect(publicText('https://example.test/x')).rejects.toMatchObject({ status: 404 });
  });
});
