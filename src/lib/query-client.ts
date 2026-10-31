import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';

/** Structured, PII-free error log — the single place for global query/mutation side effects. */
function logError(
  source: 'query' | 'mutation',
  key: readonly unknown[] | undefined,
  error: unknown,
) {
  const status = error instanceof ApiError ? error.status : undefined;
  console.error(
    `[${source}]`,
    key ?? [],
    status ?? '',
    error instanceof Error ? error.message : error,
  );
}

// 408 (timeout) and 429 (rate limited) are transient, so they retry like 5xx/network errors;
// every other 4xx is a client error that retrying cannot fix (docs/agent-rules/14 §2).
const TRANSIENT_CLIENT_ERRORS = new Set([408, 429]);
const MAX_RETRIES = 2;

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (!(error instanceof ApiError)) return true;
  return error.status < 400 || error.status >= 500 || TRANSIENT_CLIENT_ERRORS.has(error.status);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => logError('query', query.queryKey, error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => logError('mutation', undefined, error),
  }),
  defaultOptions: {
    // Local-first: most queries read SQLite, which works offline. The default 'online' mode would
    // pause them without network. Remote queries opt back in with networkMode: 'online' (07 §9).
    queries: {
      networkMode: 'always',
      staleTime: 60_000,
      retry: shouldRetryQuery,
    },
    mutations: {
      networkMode: 'always',
    },
  },
});
