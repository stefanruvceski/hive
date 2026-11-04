import type { ReactNode } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';

type Query = { data: unknown; isError: boolean; error: unknown; refetch: () => unknown };

/**
 * Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3). Shows
 * `children` once every query has data; the empty state is the caller's own.
 */
export function Gate({
  queries,
  id,
  children,
}: {
  queries: readonly Query[];
  id: string;
  children: ReactNode;
}) {
  const failed = queries.find((query) => query.data === undefined && query.isError);
  if (failed) {
    return (
      <ErrorState
        error={failed.error}
        onRetry={() => void failed.refetch()}
        testID={`${id}-error`}
      />
    );
  }
  if (queries.some((query) => query.data === undefined)) {
    return <LoadingState testID={`${id}-loading`} />;
  }
  return <>{children}</>;
}
