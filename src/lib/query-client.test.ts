import { ApiError } from '@/lib/api';

import { shouldRetryQuery } from './query-client';

describe('shouldRetryQuery', () => {
  it('retries transient failures up to twice and never other client errors', () => {
    expect(shouldRetryQuery(0, new TypeError('Network request failed'))).toBe(true);
    expect(shouldRetryQuery(0, new ApiError(503, 'GET /x failed'))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError(408, 'GET /x failed'))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError(429, 'GET /x failed'))).toBe(true);

    expect(shouldRetryQuery(0, new ApiError(400, 'GET /x failed'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(401, 'GET /x failed'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(404, 'GET /x failed'))).toBe(false);
    expect(shouldRetryQuery(2, new ApiError(503, 'GET /x failed'))).toBe(false);
  });
});
