import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyHome } from './index';
import { useBusinesses } from '../../data/business-queries';
import { useActiveView, useCategories, useEntries, useSetView } from '../../data/queries';
import { useReceiptSync } from '../../data/receipt-import';
import { useGenerateRecurring } from '../../data/recurring-queries';
import { category, entry, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/business-queries');
jest.mock('../../data/receipt-import');
jest.mock('../../data/recurring-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSetView).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useGenerateRecurring).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useCategories).mockReturnValue(loaded([category('food', { name: 'Food' })]));
  jest.mocked(useActiveView).mockReturnValue(loaded('private'));
  jest.mocked(useBusinesses).mockReturnValue(loaded([]));
  jest
    .mocked(useReceiptSync)
    .mockReturnValue({ waiting: 0, importNow: jest.fn(), importing: false });
});

const renderHome = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyHome />
    </SafeAreaProvider>,
  );

describe('MoneyHome with Wallet receipts', () => {
  it('badges receipt entries, opens the receipt on tap and shows a refund as money back', async () => {
    jest
      .mocked(useEntries)
      .mockReturnValue(
        loaded([
          entry('a', { sourceRef: 'wallet:r1:0', source: 'wallet', note: 'Maxi 12' }),
          entry('b', { sourceRef: 'wallet:r1:1', source: 'wallet', amountMinor: -5000 }),
        ]),
      );
    await renderHome();

    expect(screen.getByTestId('money-entry-a')).toHaveTextContent(/Wallet · Maxi 12/);
    expect(screen.getByTestId('money-entry-a')).toHaveTextContent(/−100 RSD/);
    expect(screen.getByTestId('money-entry-b')).toHaveTextContent(/\+50 RSD/);
    await userEvent.setup().press(screen.getByTestId('money-entry-a'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/wallet/receipt/[id]',
      params: { id: 'r1' },
    });
  });

  it('shows the import offer', async () => {
    jest.mocked(useEntries).mockReturnValue(loaded([]));
    jest
      .mocked(useReceiptSync)
      .mockReturnValue({ waiting: 2, importNow: jest.fn(), importing: false });
    await renderHome();

    expect(screen.getByText('Import 2 receipts')).toBeOnTheScreen();
  });
});
