import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WalletReceiptScreen } from './index';
import {
  useDeleteReceipt,
  useEditReceiptItem,
  useEditReceiptNote,
  useReceipt,
  useRetryReceipt,
  useSetReceiptOwner,
  useStarReceipt,
} from '../../data/receipt-queries';
import { loaded, receipt } from '../test-data';

jest.mock('../../data/receipt-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const hooks = {
  star: jest.fn(),
  note: jest.fn(),
  retry: jest.fn(),
  remove: jest.fn(),
  owner: jest.fn(),
  item: jest.fn(),
};
const frame = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={frame}>
      <WalletReceiptScreen id="r1" />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useStarReceipt).mockReturnValue({ mutate: hooks.star } as never);
  jest.mocked(useEditReceiptNote).mockReturnValue({ mutate: hooks.note } as never);
  jest.mocked(useRetryReceipt).mockReturnValue({ mutate: hooks.retry, isPending: false } as never);
  jest.mocked(useDeleteReceipt).mockReturnValue({ mutate: hooks.remove } as never);
  jest.mocked(useSetReceiptOwner).mockReturnValue({ mutate: hooks.owner } as never);
  jest.mocked(useEditReceiptItem).mockReturnValue({ mutate: hooks.item } as never);
});

describe('WalletReceiptScreen', () => {
  it('shows the receipt with its items', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    await renderScreen();

    expect(screen.getByTestId('wallet-receipt-total')).toHaveTextContent('8.379,98 RSD');
    expect(screen.getByText('EVRO DIZEL')).toBeOnTheScreen();
    expect(screen.getByTestId('wallet-receipt-item-total-r1-i1')).toHaveTextContent('8.200,00');
    expect(screen.getByText(/40 L × 205,00/)).toBeOnTheScreen();
  });

  it('shows a refund as negative', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1', { total: -17998, refund: true })));
    await renderScreen();

    expect(screen.getByTestId('wallet-receipt-total')).toHaveTextContent('-179,98 RSD');
    expect(screen.getByText('Refund')).toBeOnTheScreen();
  });

  it('keeps a pending receipt visible and lets the user try again', async () => {
    jest
      .mocked(useReceipt)
      .mockReturnValue(
        loaded(receipt('r1', { status: 'pending', total: null, items: [], journal: null })),
      );
    await renderScreen();

    expect(screen.getByText('Pending')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-receipt-retry'));
    expect(hooks.retry).toHaveBeenCalledWith('r1');
  });

  it('explains a failed receipt', async () => {
    jest.mocked(useReceipt).mockReturnValue(
      loaded(
        receipt('r1', {
          status: 'failed',
          total: null,
          items: [],
          error: "The tax office doesn't know this receipt. Pull down to try again.",
        }),
      ),
    );
    await renderScreen();

    expect(screen.getByText('Failed')).toBeOnTheScreen();
    expect(screen.getByText(/doesn't know this receipt/)).toBeOnTheScreen();
  });

  it('changes the owner to a company by PIB, and back to personal', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-receipt-owner-company'));
    expect(screen.getByTestId('wallet-receipt-owner-save')).toBeDisabled();
    await user.type(screen.getByTestId('wallet-receipt-owner-pib'), '104052135');
    await user.press(screen.getByTestId('wallet-receipt-owner-save'));
    expect(hooks.owner).toHaveBeenCalledWith({ id: 'r1', buyerTin: '104052135' });
  });

  it('keeps the company owner and can make it personal', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1', { buyerTin: '104052135' })));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-receipt-owner-personal'));
    await user.press(screen.getByTestId('wallet-receipt-owner-save'));
    expect(hooks.owner).toHaveBeenCalledWith({ id: 'r1', buyerTin: null });
  });

  it('corrects a misread price and quantity', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-receipt-item-edit-r1-i1'));
    await user.clear(screen.getByTestId('wallet-receipt-item-qty-r1-i1'));
    await user.type(screen.getByTestId('wallet-receipt-item-qty-r1-i1'), '38,5');
    await user.clear(screen.getByTestId('wallet-receipt-item-price-r1-i1'));
    await user.type(screen.getByTestId('wallet-receipt-item-price-r1-i1'), '199,90');
    await user.press(screen.getByTestId('wallet-receipt-item-save-r1-i1'));

    expect(hooks.item).toHaveBeenCalledWith(
      { receiptId: 'r1', itemId: 'r1-i1', quantity: 38.5, unitPrice: 19990 },
      expect.anything(),
    );
  });

  it('stars, notes and shows it as printed', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-receipt-star'));
    expect(hooks.star).toHaveBeenCalledWith({ id: 'r1', starred: true });

    await user.type(screen.getByTestId('wallet-receipt-note'), 'Trip');
    await fireEvent(screen.getByTestId('wallet-receipt-note'), 'endEditing');
    expect(hooks.note).toHaveBeenCalledWith({ id: 'r1', note: 'Trip' });

    await user.press(screen.getByTestId('wallet-receipt-printed-toggle'));
    expect(screen.getByTestId('wallet-receipt-printed')).toHaveTextContent('ПИБ: 100000001');
  });

  it('deletes only after confirmation, then leaves', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    hooks.remove.mockImplementation((_id: string, o: { onSuccess: (r: unknown) => void }) =>
      o.onSuccess(receipt('r1')),
    );
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-receipt-delete'));

    expect(hooks.remove).not.toHaveBeenCalled();
    alert.mock.calls[0]?.[2]?.find((b) => b.text === 'Delete')?.onPress?.();
    expect(hooks.remove).toHaveBeenCalledWith('r1', expect.anything());
    expect(router.back).toHaveBeenCalled();
  });

  it('shows a missing receipt instead of a blank screen', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(null));
    await renderScreen();

    expect(screen.getByTestId('wallet-receipt-missing')).toBeOnTheScreen();
  });
});
