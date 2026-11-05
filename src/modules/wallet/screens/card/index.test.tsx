import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as Brightness from 'expo-brightness';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WalletCardScreen } from './index';
import { useCard, useDeleteCard, useOpenCard, usePinCard } from '../../data/queries';
import { card, loaded } from '../test-data';

jest.mock('../../data/queries');
jest.mock('expo-brightness');
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

const open = jest.fn();
const pin = jest.fn();
const remove = jest.fn();
const frame = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={frame}>
      <WalletCardScreen id="a" />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useOpenCard).mockReturnValue({ mutate: open } as never);
  jest.mocked(usePinCard).mockReturnValue({ mutate: pin } as never);
  jest.mocked(useDeleteCard).mockReturnValue({ mutate: remove } as never);
  jest.mocked(Brightness.getBrightnessAsync).mockResolvedValue(0.4);
});

describe('WalletCardScreen', () => {
  it('draws the code with its number under it and counts a use', async () => {
    jest.mocked(useCard).mockReturnValue(loaded(card('a')));
    await renderScreen();

    expect(screen.getByTestId('wallet-card-barcode')).toBeOnTheScreen();
    expect(screen.getByTestId('wallet-card-number-text')).toHaveTextContent('4006 3813 3393 1');
    expect(open).toHaveBeenCalledWith('a');
  });

  it('hides a number nobody would read out', async () => {
    jest
      .mocked(useCard)
      .mockReturnValue(
        loaded(card('a', { number: 'https://example.com/c/eyJ0eXAiOiJKV1Qi', format: 'QR_CODE' })),
      );
    await renderScreen();

    expect(screen.getByTestId('wallet-card-barcode')).toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-card-number-text')).not.toBeOnTheScreen();
  });

  it('raises the brightness while open and puts it back on leaving', async () => {
    jest.mocked(useCard).mockReturnValue(loaded(card('a')));
    const view = await renderScreen();

    await waitFor(() => expect(Brightness.setBrightnessAsync).toHaveBeenCalledWith(1));
    await view.unmount();
    await waitFor(() => expect(Brightness.setBrightnessAsync).toHaveBeenCalledWith(0.4));
  });

  it('opens the receipt camera from the header, to scan the receipt after the card', async () => {
    jest.mocked(useCard).mockReturnValue(loaded(card('a')));
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-card-scan-receipt'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/wallet',
      params: { tab: 'receipts', scan: '1' },
    });
  });

  it('pins and unpins', async () => {
    jest.mocked(useCard).mockReturnValue(loaded(card('a')));
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-card-pin'));

    expect(pin).toHaveBeenCalledWith({ id: 'a', pinned: true });
  });

  it('deletes only after confirmation, then leaves', async () => {
    jest.mocked(useCard).mockReturnValue(loaded(card('a')));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    remove.mockImplementation((_id: string, options: { onSuccess: (row: unknown) => void }) =>
      options.onSuccess(card('a')),
    );
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-card-delete'));

    expect(remove).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    buttons.find((b) => b.text === 'Delete')?.onPress?.();
    expect(remove).toHaveBeenCalledWith('a', expect.anything());
    expect(router.back).toHaveBeenCalled();
  });

  it('shows a missing card instead of a blank screen', async () => {
    jest.mocked(useCard).mockReturnValue(loaded(null));
    await renderScreen();

    expect(screen.getByTestId('wallet-card-missing')).toBeOnTheScreen();
  });
});
