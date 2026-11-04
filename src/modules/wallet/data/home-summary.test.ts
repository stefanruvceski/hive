import { renderHook } from '@testing-library/react-native';

import { useToday } from '@/hooks/use-today';

import { useWalletHomeSummary } from './home-summary';
import { useCards } from './queries';
import { useReceipts } from './receipt-queries';

// The database boundary: Wallet's query hooks (docs/agent-rules/09 §5).
jest.mock('./queries');
jest.mock('./receipt-queries');
jest.mock('@/hooks/use-today');

const mockQueries = (receipts: object, cards: object) => {
  jest.mocked(useReceipts).mockReturnValue(receipts as never);
  jest.mocked(useCards).mockReturnValue(cards as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useToday).mockReturnValue('2026-11-04');
});

describe('useWalletHomeSummary', () => {
  it('is pending until the receipts and the cards load', async () => {
    mockQueries({ isError: false }, { data: [] });
    const { result } = await renderHook(() => useWalletHomeSummary());
    expect(result.current).toEqual({ status: 'pending' });
  });

  it('fails when a query fails before it has data', async () => {
    mockQueries({ data: [] }, { isError: true });
    const { result } = await renderHook(() => useWalletHomeSummary());
    expect(result.current).toEqual({ status: 'error' });
  });

  it('summarizes the month once the data is in, even if a refetch fails', async () => {
    mockQueries({ data: [], isError: true }, { data: [], isError: false });
    const { result } = await renderHook(() => useWalletHomeSummary());
    expect(result.current).toMatchObject({
      status: 'success',
      summary: { headline: 'Nothing yet' },
    });
  });
});
