import { useToday } from '@/hooks/use-today';
import type { HomeSummaryResult } from '@/utils/home-summary';

import { useCards } from './queries';
import { useReceipts } from './receipt-queries';
import { walletHomeSummary } from '../domain/home-summary';

/**
 * Wallet's widget on Home's Today section: what this month's receipts add up to. Data first: once
 * the data is in it keeps showing it, even if a background refetch fails.
 */
export function useWalletHomeSummary(): HomeSummaryResult {
  const receipts = useReceipts();
  const cards = useCards();
  const today = useToday();

  if (receipts.data && cards.data) {
    return {
      status: 'success',
      summary: walletHomeSummary(receipts.data, cards.data.length, today),
    };
  }
  if (receipts.isError || cards.isError) return { status: 'error' };
  return { status: 'pending' };
}
