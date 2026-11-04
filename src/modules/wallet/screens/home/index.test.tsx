import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';

import { WalletHome } from './index';
import { rememberDeletedCard } from '../../data/deleted-card';
import { useCards, useRestoreCard } from '../../data/queries';
import { card, loaded } from '../test-data';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const restore = jest.fn();
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
  rememberDeletedCard(null);
  jest.mocked(useRestoreCard).mockReturnValue({ mutate: restore } as never);
});

describe('WalletHome', () => {
  it('lists the cards in the order the query returns', async () => {
    jest.mocked(useCards).mockReturnValue(loaded([card('a', { pinned: true }), card('b')]));
    await renderHome();

    expect(screen.getByText('Card a')).toBeOnTheScreen();
    expect(screen.getByText(/Pinned · 4006 3813 3393 1/)).toBeOnTheScreen();
    expect(screen.getByText('Card b')).toBeOnTheScreen();
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
});
