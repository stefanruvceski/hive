import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReceiptsTab } from './receipts-tab';
import { useAddReceipt, useReceipts, useSyncReceipts } from '../../data/receipt-queries';
import { loaded, receipt } from '../test-data';

jest.mock('../../data/receipt-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-camera', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
    CameraView: ({ onBarcodeScanned }: { onBarcodeScanned: (r: object) => void }) => (
      <Pressable
        testID="fake-camera"
        onPress={() => onBarcodeScanned({ type: 'qr', data: 'https://suf.purs.gov.rs/v/?vl=Q1' })}
      />
    ),
  };
});

const add = jest.fn();
const refresh = jest.fn();
const frame = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderTab = () =>
  render(
    <SafeAreaProvider initialMetrics={frame}>
      <ReceiptsTab />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAddReceipt).mockReturnValue({ mutate: add, isPending: false } as never);
  jest.mocked(useSyncReceipts).mockReturnValue({ refresh, isRefreshing: false });
});

describe('ReceiptsTab', () => {
  it('lists receipts by month with the total, and marks pending and failed ones', async () => {
    jest
      .mocked(useReceipts)
      .mockReturnValue(
        loaded([
          receipt('r1'),
          receipt('r2', { status: 'pending', total: null, time: null, shop: null, company: null }),
          receipt('r3', { time: '2026-09-02T10:00:00', total: -17998, refund: true }),
        ]),
      );
    await renderTab();

    expect(screen.getByText('October 2026')).toBeOnTheScreen();
    expect(screen.getByText('September 2026')).toBeOnTheScreen();
    expect(screen.getByTestId('wallet-receipt-total-r1')).toHaveTextContent('8.379,98');
    expect(screen.getByTestId('wallet-receipt-total-r3')).toHaveTextContent('-179,98');
    expect(screen.getByText(/Pending/)).toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-receipt-total-r2')).not.toBeOnTheScreen();
  });

  it('opens a receipt', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    await renderTab();
    await userEvent.setup().press(screen.getByTestId('wallet-receipt-r1'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/wallet/receipt/[id]',
      params: { id: 'r1' },
    });
  });

  it('adds a scanned QR code and says when it was already saved', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    add.mockImplementation(
      (_text: string, o: { onSuccess: (r: { id: string; duplicate: boolean }) => void }) =>
        o.onSuccess({ id: 'r1', duplicate: true }),
    );
    await renderTab();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-receipt-scan'));
    await user.press(screen.getByTestId('fake-camera'));

    expect(add).toHaveBeenCalledWith('https://suf.purs.gov.rs/v/?vl=Q1', expect.anything());
    expect(screen.getByTestId('wallet-receipt-message')).toHaveTextContent(/already saved/);
  });

  it('shows why a scanned code was refused', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    add.mockImplementation((_text: string, o: { onError: (e: Error) => void }) =>
      o.onError(new Error('This is not a Serbian fiscal receipt QR code.')),
    );
    await renderTab();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-receipt-scan'));
    await user.press(screen.getByTestId('fake-camera'));

    expect(screen.getByTestId('wallet-receipt-message')).toHaveTextContent(/not a Serbian/);
  });

  it('searches in Latin and filters starred receipts', async () => {
    jest
      .mocked(useReceipts)
      .mockReturnValue(
        loaded([
          receipt('r1', { shop: 'Mlekara Šabac', starred: true }),
          receipt('r2', { shop: 'Maxi 12' }),
        ]),
      );
    await renderTab();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('wallet-receipt-search'), 'шабац');
    expect(screen.getByTestId('wallet-receipt-r1')).toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-receipt-r2')).not.toBeOnTheScreen();

    await user.clear(screen.getByTestId('wallet-receipt-search'));
    await user.press(screen.getByTestId('wallet-receipt-starred-filter'));
    expect(screen.getByTestId('wallet-receipt-r1')).toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-receipt-r2')).not.toBeOnTheScreen();
  });

  it('asks the tax office again on pull to refresh', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    await renderTab();

    screen.getByTestId('wallet-receipts-list').props.refreshControl.props.onRefresh();

    expect(refresh).toHaveBeenCalled();
  });

  it('shows an empty state that still offers scanning', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([]));
    await renderTab();

    expect(screen.getByTestId('wallet-receipts-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('wallet-receipt-scan')).toBeOnTheScreen();
  });

  it('shows a retryable error', async () => {
    jest.mocked(useReceipts).mockReturnValue({
      isError: true,
      error: new Error('SELECT failed'),
      refetch: jest.fn(),
    } as never);
    await renderTab();

    expect(screen.getByTestId('wallet-receipts-error')).toBeOnTheScreen();
    expect(screen.queryByText(/SELECT failed/)).not.toBeOnTheScreen();
  });
});
