import { renderHook } from '@testing-library/react-native';

import { useToday } from '@/hooks/use-today';

import { useBudgets } from './budget-queries';
import { useBusinesses } from './business-queries';
import { useMoneyHomeSummary } from './home-summary';
import { useActiveView, useCategories, useEntries, useItems } from './queries';

// The database boundary: Money's query hooks (docs/agent-rules/09 §5).
jest.mock('./queries');
jest.mock('./business-queries');
jest.mock('./budget-queries');
jest.mock('@/hooks/use-today');

const mockQueries = (entries: object, saved: object, businesses: object) => {
  jest.mocked(useItems).mockReturnValue({ data: [] } as never);
  jest.mocked(useCategories).mockReturnValue({ data: [] } as never);
  jest.mocked(useBudgets).mockReturnValue({ data: [] } as never);
  jest.mocked(useEntries).mockReturnValue(entries as never);
  jest.mocked(useActiveView).mockReturnValue(saved as never);
  jest.mocked(useBusinesses).mockReturnValue(businesses as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useToday).mockReturnValue('2026-11-04');
});

describe('useMoneyHomeSummary', () => {
  it('is pending until the entries, the view and the businesses load', async () => {
    mockQueries({ isError: false }, { data: null }, { data: [] });
    const { result } = await renderHook(() => useMoneyHomeSummary());
    expect(result.current).toEqual({ status: 'pending' });
  });

  it('fails when a query fails before it has data', async () => {
    mockQueries({ isError: true }, { data: null }, { data: [] });
    const { result } = await renderHook(() => useMoneyHomeSummary());
    expect(result.current).toEqual({ status: 'error' });
  });

  it('summarizes the month once the data is in, even if a refetch fails', async () => {
    mockQueries({ data: [], isError: true }, { data: null }, { data: [] });
    const { result } = await renderHook(() => useMoneyHomeSummary());
    expect(result.current).toMatchObject({
      status: 'success',
      summary: { headline: 'Nothing this month' },
    });
  });
});
