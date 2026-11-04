import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReceiptsTab } from './receipts-tab';
import { useShopGroups } from '../../data/price-queries';
import { useAddReceipt, useReceipts, useSyncReceipts } from '../../data/receipt-queries';
import { loaded, receipt } from '../test-data';

jest.mock('../../data/receipt-queries');
jest.mock('../../data/price-queries');
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
const renderTab = (props: ComponentProps<typeof ReceiptsTab> = {}) =>
  render(
    <SafeAreaProvider initialMetrics={frame}>
      <ReceiptsTab {...props} />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAddReceipt).mockReturnValue({ mutate: add, isPending: false } as never);
  jest.mocked(useShopGroups).mockReturnValue(loaded([]));
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
    const onScanningChange = jest.fn();
    await renderTab({ scanning: true, onScanningChange });
    const user = userEvent.setup();

    await user.press(screen.getByTestId('fake-camera'));

    expect(onScanningChange).toHaveBeenCalledWith(false);
    expect(add).toHaveBeenCalledWith('https://suf.purs.gov.rs/v/?vl=Q1', expect.anything());
    expect(screen.getByTestId('wallet-receipt-message')).toHaveTextContent(/already saved/);
  });

  it('shows why a scanned code was refused', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    add.mockImplementation((_text: string, o: { onError: (e: Error) => void }) =>
      o.onError(new Error('This is not a Serbian fiscal receipt QR code.')),
    );
    await renderTab({ scanning: true });
    const user = userEvent.setup();

    await user.press(screen.getByTestId('fake-camera'));

    expect(screen.getByTestId('wallet-receipt-message')).toHaveTextContent(/not a Serbian/);
  });

  it('searches in Latin and has no starred filter', async () => {
    jest
      .mocked(useReceipts)
      .mockReturnValue(
        loaded([
          receipt('r1', { shop: 'Mlekara Šabac', company: null, tin: null }),
          receipt('r2', { shop: 'Pekara Ruma', company: null, tin: null }),
        ]),
      );
    await renderTab();

    await userEvent.setup().type(screen.getByTestId('wallet-receipt-search'), 'шабац');
    expect(screen.getByTestId('wallet-receipt-r1')).toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-receipt-r2')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-receipt-starred-filter')).not.toBeOnTheScreen();
  });

  it('shows one name per company on the list, not the branch', async () => {
    jest
      .mocked(useReceipts)
      .mockReturnValue(
        loaded([
          receipt('r1', { tin: '104052135', shop: '1206824-BS Ruma 1' }),
          receipt('r2', { tin: '104052135', shop: '77-BS Sabac 3' }),
        ]),
      );
    await renderTab();

    expect(screen.getAllByText('NIS')).toHaveLength(2);
    expect(screen.queryByText(/Ruma 1/)).not.toBeOnTheScreen();
  });

  it('shows only the receipts of one company and can show all again', async () => {
    jest
      .mocked(useReceipts)
      .mockReturnValue(
        loaded([receipt('r1', { tin: '104052135' }), receipt('r2', { tin: '100000001' })]),
      );
    const onClearPib = jest.fn();
    await renderTab({ pib: '104052135', onClearPib });

    expect(screen.getByTestId('wallet-receipt-r1')).toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-receipt-r2')).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-receipts-company-filter'));
    expect(onClearPib).toHaveBeenCalled();
  });

  it('adds a pasted link from the field under the header', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    await renderTab();
    const user = userEvent.setup();

    expect(screen.getByTestId('wallet-receipt-link-add')).toBeDisabled();
    await user.type(screen.getByTestId('wallet-receipt-link'), 'https://suf.purs.gov.rs/v/?vl=Q2');
    await user.press(screen.getByTestId('wallet-receipt-link-add'));
    expect(add).toHaveBeenCalledWith('https://suf.purs.gov.rs/v/?vl=Q2', expect.anything());
  });

  it('asks the tax office again on pull to refresh', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([receipt('r1')]));
    await renderTab();

    screen.getByTestId('wallet-receipts-list').props.refreshControl.props.onRefresh();

    expect(refresh).toHaveBeenCalled();
  });

  it('shows an empty state that still offers adding a link', async () => {
    jest.mocked(useReceipts).mockReturnValue(loaded([]));
    await renderTab();

    expect(screen.getByTestId('wallet-receipts-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('wallet-receipt-link')).toBeOnTheScreen();
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
