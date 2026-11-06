import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';

import { WalletHome } from './index';
import { rememberDeletedCard } from '../../data/deleted-card';
import { rememberDeletedReceipt } from '../../data/deleted-receipt';
import { useShopGroups } from '../../data/price-queries';
import { useCards, useRestoreCard } from '../../data/queries';
import {
  useAddReceipt,
  useReceipts,
  useRestoreReceipt,
  useSyncReceipts,
} from '../../data/receipt-queries';
import { useStackedRow } from '../components/use-stacked-row';
import { card, loaded, receipt } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../components/use-stacked-row', () => ({
  ...jest.requireActual('../components/use-stacked-row'),
  useStackedRow: jest.fn(() => false),
}));
jest.mock('../../data/receipt-queries');
jest.mock('../../data/price-queries');
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
  CameraView: () => null,
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const restore = jest.fn();
const restoreReceipt = jest.fn();
const frame = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderHome = () =>
  render(
    <SafeAreaProvider initialMetrics={frame}>
      <WalletHome />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  rememberDeletedCard(null);
  rememberDeletedReceipt(null);
  jest.mocked(useRestoreCard).mockReturnValue({ mutate: restore } as never);
  jest.mocked(useRestoreReceipt).mockReturnValue({ mutate: restoreReceipt } as never);
  jest.mocked(useSyncReceipts).mockReturnValue({ refresh: jest.fn(), isRefreshing: false });
  jest.mocked(useReceipts).mockReturnValue(loaded([]));
  jest.mocked(useAddReceipt).mockReturnValue({ mutate: jest.fn(), isPending: false } as never);
  jest.mocked(useShopGroups).mockReturnValue(loaded([]));
});

describe('WalletHome', () => {
  it('lists the cards in the order the query returns', async () => {
    jest.mocked(useCards).mockReturnValue(loaded([card('a', { pinned: true }), card('b')]));
    await renderHome();

    expect(screen.getByText('Card a')).toBeOnTheScreen();
    expect(screen.getByText('★ •••• 3931')).toBeOnTheScreen();
    expect(screen.getByText('Card b')).toBeOnTheScreen();
  });

  it('shows no number line for a code that is random characters', async () => {
    jest
      .mocked(useCards)
      .mockReturnValue(
        loaded([
          card('a', { number: 'https://x.test/q?t=3e3cjw==' }),
          card('b', { number: '3e3c' }),
        ]),
      );
    await renderHome();
    expect(screen.queryByText(/••••/)).not.toBeOnTheScreen();
  });

  it('cuts a long card name to its first two words, but shows all of it at accessibility text sizes', async () => {
    jest
      .mocked(useCards)
      .mockReturnValue(loaded([card('a', { name: 'A very long loyalty card' })]));

    jest.mocked(useStackedRow).mockReturnValue(false);
    await renderHome();
    expect(screen.getByText('A very')).toBeOnTheScreen();
    expect(screen.queryByText('A very long loyalty card')).not.toBeOnTheScreen();
    await screen.unmount();

    jest.mocked(useStackedRow).mockReturnValue(true);
    await renderHome();
    expect(screen.getByText('A very long loyalty card').props.numberOfLines).toBeUndefined();
  });

  it('opens a card and the add screen', async () => {
    jest.mocked(useCards).mockReturnValue(loaded([card('a')]));
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-card-a'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/wallet/card/[id]',
      params: { id: 'a' },
    });
    await user.press(screen.getByTestId('wallet-add'));
    expect(router.push).toHaveBeenCalledWith('/wallet/card-new');
  });

  it('shows an empty state that offers Add', async () => {
    jest.mocked(useCards).mockReturnValue(loaded([]));
    await renderHome();

    expect(screen.getByTestId('wallet-empty')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-empty-add'));
    expect(router.push).toHaveBeenCalledWith('/wallet/card-new');
  });

  it('shows a retryable error with friendly copy', async () => {
    jest.mocked(useCards).mockReturnValue({
      isError: true,
      error: new ApiError(500, 'SELECT failed'),
      refetch: jest.fn(),
    } as never);
    await renderHome();

    expect(screen.getByTestId('wallet-error')).toBeOnTheScreen();
    expect(screen.queryByText(/SELECT failed/)).not.toBeOnTheScreen();
  });

  it('offers Undo for a deleted card and puts the card back', async () => {
    jest.mocked(useCards).mockReturnValue(loaded([]));
    await renderHome();
    const gone = card('x', { name: 'Maxi' });

    await act(async () => rememberDeletedCard(gone));
    expect(screen.getByText('Maxi deleted')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-undo'));

    expect(restore).toHaveBeenCalledWith(gone);
    expect(screen.queryByTestId('wallet-undo')).not.toBeOnTheScreen();
  });

  it('switches to the receipts tab', async () => {
    jest.mocked(useCards).mockReturnValue(loaded([card('a')]));
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    await renderHome();

    await userEvent.setup().press(screen.getByTestId('wallet-tab-receipts'));

    expect(screen.getByTestId('wallet-receipts-list')).toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-card-a')).not.toBeOnTheScreen();
  });

  it('puts Scan receipt in the header of the receipts tab and opens the camera from it', async () => {
    jest.mocked(useCards).mockReturnValue(loaded([card('a')]));
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    await renderHome();
    const user = userEvent.setup();

    expect(screen.queryByTestId('wallet-receipt-scan')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('wallet-tab-receipts'));
    await user.press(screen.getByTestId('wallet-receipt-scan'));

    expect(screen.getByTestId('wallet-scanner')).toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-add')).not.toBeOnTheScreen();
  });

  it('offers Undo for a deleted receipt and brings it back', async () => {
    jest.mocked(useCards).mockReturnValue(loaded([]));
    await renderHome();
    const gone = receipt('r1');

    await act(async () => rememberDeletedReceipt(gone));
    expect(screen.getByText('Receipt deleted')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-undo'));

    expect(restoreReceipt).toHaveBeenCalledWith(gone);
  });

  it('opens the receipt camera at once when sent here from a card', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ tab: 'receipts', scan: '1' });
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    jest.mocked(useCards).mockReturnValue(loaded([]));
    await renderHome();

    expect(screen.getByTestId('wallet-scanner')).toBeOnTheScreen();
  });
});
