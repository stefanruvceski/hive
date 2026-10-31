import { api, ApiNotConfiguredError, isApiConfigured } from './api';

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
