import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type Health = {
  status: 'ok';
  time: string;
};

// Hierarchical key factory — every key for this domain comes from here (agent-rules/07 §1).
export const healthKeys = {
  all: ['health'] as const,
};

// Shared queryOptions: same definition for useQuery, prefetchQuery and tests.
export const healthQuery = () =>
  queryOptions({
    queryKey: healthKeys.all,
    queryFn: ({ signal }) => api<Health>('/api/health', { signal }),
  });

/** Exemplar data hook: screen-local, wraps api<T>() — components never fetch directly. */
export function useHealth() {
  return useQuery(healthQuery());
}
