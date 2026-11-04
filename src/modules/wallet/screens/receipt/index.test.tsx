import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useBusinesses } from '@/hooks/use-businesses';

import { WalletReceiptScreen } from './index';
import { useShopGroups } from '../../data/price-queries';
import {
  useDeleteReceipt,
  useEditReceiptItem,
  useEditReceiptNote,
  useReceipt,
  useRetryReceipt,
  useSetReceiptOwner,
} from '../../data/receipt-queries';
import { loaded, receipt } from '../test-data';

jest.mock('../../data/receipt-queries');
jest.mock('../../data/price-queries');
jest.mock('@/hooks/use-businesses', () => ({
  ...jest.requireActual('@/hooks/use-businesses'),
  useBusinesses: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

const hooks = {
  note: jest.fn(),
  retry: jest.fn(),
  remove: jest.fn(),
  owner: jest.fn(),
  item: jest.fn(),
};
const firm = {
  id: 'b1',
  name: 'Moja firma',
  pib: '104052135',
  archivedAt: null,
  createdAt: '2026-01-01',
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
  jest.mocked(useShopGroups).mockReturnValue(loaded([]));
  jest.mocked(useBusinesses).mockReturnValue(loaded([firm]));
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

  it('shows the current owner as plain text and offers Save only for a change', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1', { buyerTin: '104052135' })));
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByTestId('wallet-receipt-owner-current')).toHaveTextContent(
      'Company · Moja firma',
    );
    expect(screen.queryByTestId('wallet-receipt-owner-save')).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('wallet-receipt-owner-personal'));
    await user.press(screen.getByTestId('wallet-receipt-owner-save'));
    expect(hooks.owner).toHaveBeenCalledWith({ id: 'r1', buyerTin: null });
  });

  it('chooses a known business without typing its PIB', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByTestId('wallet-receipt-owner-current')).toHaveTextContent('Personal');
    await user.press(screen.getByTestId('wallet-receipt-owner-pib:104052135'));
    await user.press(screen.getByTestId('wallet-receipt-owner-save'));
    expect(hooks.owner).toHaveBeenCalledWith({ id: 'r1', buyerTin: '104052135' });
  });

  it('takes a new PIB as the fallback and says why it cannot be saved yet', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('wallet-receipt-owner-other'));
    await user.type(screen.getByTestId('wallet-receipt-owner-pib'), '1040');
    expect(screen.getByTestId('wallet-receipt-owner-problem')).toHaveTextContent(/9 digits/);
    expect(screen.queryByTestId('wallet-receipt-owner-save')).not.toBeOnTheScreen();
    await user.type(screen.getByTestId('wallet-receipt-owner-pib'), '52135');
    await user.press(screen.getByTestId('wallet-receipt-owner-save'));
    expect(hooks.owner).toHaveBeenCalledWith({ id: 'r1', buyerTin: '104052135' });
  });

  it('shows a buyer PIB no business has as it is, without asking to save a business', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1', { buyerTin: '100000001' })));
    await renderScreen();

    expect(screen.getByTestId('wallet-receipt-owner-current')).toHaveTextContent(
      'Company · PIB 100000001',
    );
    expect(screen.queryByTestId('wallet-receipt-owner-save')).not.toBeOnTheScreen();
  });

  it('shows only the company, date, total and items; the rest is under "see as printed"', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByTestId('wallet-receipt-date')).toHaveTextContent('2026-10-25 14:03');
    for (const hidden of ['Address', 'Invoice', 'Payment', 'Shop PIB']) {
      expect(screen.queryByText(hidden)).not.toBeOnTheScreen();
    }
    expect(screen.queryByTestId('wallet-receipt-star')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('wallet-receipt-printed-toggle'));
    expect(screen.getByText('Invoice')).toBeOnTheScreen();
    expect(screen.getByText('AB-1')).toBeOnTheScreen();
    expect(screen.getByText('Shop PIB')).toBeOnTheScreen();
  });

  it('names the company uniformly and opens its receipts', async () => {
    jest
      .mocked(useReceipt)
      .mockReturnValue(
        loaded(receipt('r1', { tin: '104052135', company: 'X d.o.o.', shop: '1206824-BS Ruma 1' })),
      );
    await renderScreen();

    expect(screen.getByTestId('wallet-receipt-title')).toHaveTextContent('NIS');
    await userEvent.setup().press(screen.getByTestId('wallet-receipt-company'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/wallet',
      params: { tab: 'receipts', pib: '104052135' },
    });
  });

  it('cleans the product code and writes litres as L', async () => {
    const base = receipt('r1');
    jest.mocked(useReceipt).mockReturnValue(
      loaded(
        receipt('r1', {
          items: [{ ...base.items[0]!, name: 'EVRO PREMIJUM BMB-95,2710124500', unit: 'LIT' }],
        }),
      ),
    );
    await renderScreen();

    expect(screen.getByText('EVRO PREMIJUM BMB-95')).toBeOnTheScreen();
    expect(screen.getByText(/40 L × 205,00/)).toBeOnTheScreen();
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

  it('notes and shows it as printed', async () => {
    jest.mocked(useReceipt).mockReturnValue(loaded(receipt('r1')));
    await renderScreen();
    const user = userEvent.setup();

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
