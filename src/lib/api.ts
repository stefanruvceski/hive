import { env } from '@/lib/env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** `api()` was called but no `EXPO_PUBLIC_API_URL` is configured for this bundle. */
export class ApiNotConfiguredError extends Error {
  constructor() {
    super('No API URL is configured (EXPO_PUBLIC_API_URL)');
    this.name = 'ApiNotConfiguredError';
  }
}

/** Whether remote calls can be made. Gate remote-only UI and queries on it. */
export function isApiConfigured(): boolean {
  return env.apiUrl !== undefined;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/** Minimal typed JSON client. Wrap in TanStack Query hooks — never call directly from components. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (env.apiUrl === undefined) throw new ApiNotConfiguredError();

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `${init?.method ?? 'GET'} ${path} failed`);
  }

  return (await response.json()) as T;
}
