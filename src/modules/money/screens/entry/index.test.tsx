import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyEntry } from './index';
import { useBusinesses } from '../../data/business-queries';
import {
  useActiveView,
  useSetView,
  useCategories,
  useDeleteEntry,
  useEntries,
  useItems,
  useRates,
  useSaveEntry,
} from '../../data/queries';
import { useNbsRate } from '../../data/rate-queries';
import { business, category, entry, failed, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/business-queries');
jest.mock('../../data/rate-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Monday 2 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const save = jest.fn();
const remove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useEntries)
    .mockReturnValue(loaded([entry('e1', { note: 'Lunch', categoryId: 'food' })]));
  jest.mocked(useItems).mockReturnValue(loaded([]));
  jest
    .mocked(useCategories)
    .mockReturnValue(
      loaded([
        category('food', { name: 'Food' }),
        category('salary', { name: 'Salary', kind: 'income' }),
        category('fuel', { name: 'Fuel', space: 'business' }),
      ]),
    );
  jest
    .mocked(useRates)
    .mockReturnValue(
      loaded([{ currency: 'EUR', date: '2026-10-20', rate: 117.2, source: 'manual' }]),
    );
  jest.mocked(useActiveView).mockReturnValue(loaded('private'));
  jest.mocked(useBusinesses).mockReturnValue(loaded([]));
  jest.mocked(useSetView).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useNbsRate).mockReturnValue({ data: null, isFetching: false } as never);
  jest.mocked(useSaveEntry).mockReturnValue({ mutate: save } as never);
  jest.mocked(useDeleteEntry).mockReturnValue({ mutate: remove } as never);
});

const renderEntry = (id?: string) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyEntry id={id} />
    </SafeAreaProvider>,
  );

describe('MoneyEntry', () => {
  it('saves an expense in the open space', async () => {
    await renderEntry();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-amount'), '12,50');
    await user.press(screen.getByTestId('money-entry-category-food'));
    await user.type(screen.getByTestId('money-entry-note'), 'Lunch');
    await user.press(screen.getByTestId('money-entry-save'));

    expect(save).toHaveBeenCalledWith(
      {
        id: undefined,
        space: 'private',
        businessId: null,
        kind: 'expense',
        amountMinor: 1250,
        currency: 'RSD',
        rate: 1,
        date: '2026-11-02',
        note: 'Lunch',
        categoryId: 'food',
        items: [],
      },
      expect.anything(),
    );
  });

  it('asks for an amount and a category first', async () => {
    await renderEntry();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-entry-save'));
    expect(screen.getByTestId('money-entry-error')).toHaveTextContent(/amount/);
    await user.type(screen.getByTestId('money-entry-amount'), '5');
    await user.press(screen.getByTestId('money-entry-save'));
    expect(screen.getByTestId('money-entry-error')).toHaveTextContent(/category/);
    expect(save).not.toHaveBeenCalled();
  });

  it('only offers the categories of the kind', async () => {
    await renderEntry();
    const user = userEvent.setup();

    expect(screen.getByTestId('money-entry-category-food')).toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-category-salary')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-category-fuel')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('money-entry-kind-income'));
    expect(screen.getByTestId('money-entry-category-salary')).toBeOnTheScreen();
  });

  it('suggests the latest rate for a foreign currency and shows the RSD value', async () => {
    await renderEntry();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-amount'), '10');
    await user.press(screen.getByTestId('money-entry-currency-EUR'));
    expect(screen.queryByTestId('money-entry-rate')).not.toBeOnTheScreen();
    expect(screen.getByTestId('money-entry-rsd')).toHaveTextContent(/1,172 RSD at 117\.2$/);
  });

  it("prefers the bank's rate for the day and says so", async () => {
    jest.mocked(useNbsRate).mockReturnValue({ data: 117.4, isFetching: false } as never);
    await renderEntry();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-amount'), '10');
    await user.press(screen.getByTestId('money-entry-currency-EUR'));
    expect(screen.queryByTestId('money-entry-rate')).not.toBeOnTheScreen();
    expect(screen.getByTestId('money-entry-rsd')).toHaveTextContent(
      /at 117\.4 \(NBS middle rate\)/,
    );
  });

  it('asks for a rate only when none is known', async () => {
    jest.mocked(useNbsRate).mockReturnValue({ data: undefined, isFetching: false } as never);
    await renderEntry();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-amount'), '10');
    await user.press(screen.getByTestId('money-entry-currency-USD'));
    await user.type(screen.getByTestId('money-entry-rate'), '118');
    expect(screen.getByTestId('money-entry-rsd')).toHaveTextContent(/1,180 RSD at 118$/);
  });

  it('says why the bank rate could not be had', async () => {
    jest.mocked(useNbsRate).mockReturnValue({
      data: null,
      failure: 'the rate service answered with an error (HTTP 503)',
      isFetching: false,
    } as never);
    await renderEntry();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-amount'), '10');
    await user.press(screen.getByTestId('money-entry-currency-USD'));
    expect(screen.getByTestId('money-entry-rsd')).toHaveTextContent(
      'Could not get the NBS rate: the rate service answered with an error (HTTP 503). Enter one.',
    );
    expect(screen.getByTestId('money-entry-rate')).toBeOnTheScreen();
  });

  it('says when the bank rate is being fetched', async () => {
    jest.mocked(useNbsRate).mockReturnValue({ data: undefined, isFetching: true } as never);
    await renderEntry();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-amount'), '10');
    await user.press(screen.getByTestId('money-entry-currency-USD'));
    expect(screen.getByTestId('money-entry-rsd')).toHaveTextContent(/Getting the NBS rate/);
  });

  it('needs a rate for a currency without one', async () => {
    await renderEntry();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-amount'), '10');
    await user.press(screen.getByTestId('money-entry-currency-USD'));
    await user.press(screen.getByTestId('money-entry-category-food'));
    await user.press(screen.getByTestId('money-entry-save'));
    expect(screen.getByTestId('money-entry-error')).toHaveTextContent(/rate/);
  });

  it('saves a payout from a business, without a category', async () => {
    jest.mocked(useBusinesses).mockReturnValue(loaded([business('b1', { name: 'Shop' })]));
    await renderEntry();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-entry-kind-payout'));
    expect(screen.getByTestId('money-entry-payout-hint')).toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-category-food')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-owner-private')).not.toBeOnTheScreen();
    await user.type(screen.getByTestId('money-entry-amount'), '1000');
    await user.press(screen.getByTestId('money-entry-save'));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'payout',
        space: 'business',
        businessId: 'b1',
        categoryId: null,
        amountMinor: 100000,
      }),
      expect.anything(),
    );
  });

  it('asks for a business before a payout', async () => {
    await renderEntry();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-entry-kind-payout'));
    expect(screen.getByTestId('money-entry-no-business')).toBeOnTheScreen();
    await user.type(screen.getByTestId('money-entry-amount'), '1000');
    await user.press(screen.getByTestId('money-entry-save'));
    expect(screen.getByTestId('money-entry-error')).toHaveTextContent(/business/);
    expect(save).not.toHaveBeenCalled();
  });

  it('tags an entry with a business and offers that list of categories', async () => {
    jest.mocked(useBusinesses).mockReturnValue(loaded([business('b1', { name: 'Shop' })]));
    await renderEntry();
    const user = userEvent.setup();

    expect(screen.getByTestId('money-entry-category-food')).toBeOnTheScreen();
    await user.press(screen.getByTestId('money-entry-owner-b1'));
    expect(screen.queryByTestId('money-entry-category-food')).not.toBeOnTheScreen();
    await user.type(screen.getByTestId('money-entry-amount'), '40');
    await user.press(screen.getByTestId('money-entry-category-fuel'));
    await user.press(screen.getByTestId('money-entry-save'));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ space: 'business', businessId: 'b1', categoryId: 'fuel' }),
      expect.anything(),
    );
  });

  it('starts in the business that is open', async () => {
    jest.mocked(useActiveView).mockReturnValue(loaded('b1'));
    jest.mocked(useBusinesses).mockReturnValue(loaded([business('b1', { name: 'Shop' })]));
    await renderEntry();
    expect(screen.getByTestId('money-entry-category-fuel')).toBeOnTheScreen();
  });

  it('has no way to type items by hand', async () => {
    await renderEntry();

    expect(screen.queryByText(/Items/)).not.toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-item-add')).not.toBeOnTheScreen();
  });

  it('keeps the items an entry already has, and keeps its amount in line with them', async () => {
    jest.mocked(useEntries).mockReturnValue(loaded([entry('e1', { categoryId: null })]));
    jest.mocked(useItems).mockReturnValue(
      loaded([
        { id: 'i1', entryId: 'e1', name: 'Milk', amountMinor: 6000, categoryId: 'food' },
        { id: 'i2', entryId: 'e1', name: 'Bread', amountMinor: 4000, categoryId: 'food' },
      ] as never),
    );
    await renderEntry('e1');
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-note'), 'Weekly');
    await user.press(screen.getByTestId('money-entry-save'));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: null,
        items: [
          { name: 'Milk', amountMinor: 6000, categoryId: 'food' },
          { name: 'Bread', amountMinor: 4000, categoryId: 'food' },
        ],
      }),
      expect.anything(),
    );

    save.mockClear();
    await user.clear(screen.getByTestId('money-entry-amount'));
    await user.type(screen.getByTestId('money-entry-amount'), '120');
    await user.press(screen.getByTestId('money-entry-save'));
    expect(screen.getByTestId('money-entry-error')).toHaveTextContent(/items add up to/);
    expect(save).not.toHaveBeenCalled();
  });

  it('opens an existing entry filled in, and deletes it after a confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderEntry('e1');
    const user = userEvent.setup();

    expect(screen.getByTestId('money-entry-amount').props.value).toBe('100.00');
    expect(screen.getByTestId('money-entry-note').props.value).toBe('Lunch');
    await user.press(screen.getByTestId('money-entry-delete'));
    const buttons = alert.mock.calls[0]?.[2];
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    expect(remove).toHaveBeenCalledWith('e1', expect.anything());
    alert.mockRestore();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says so when the entry no longer exists', async () => {
    await renderEntry('gone');
    expect(screen.getByTestId('money-entry-missing')).toBeOnTheScreen();
  });

  it('shows an error with retry when loading fails', async () => {
    const refetch = jest.fn();
    jest.mocked(useEntries).mockReturnValue(failed(refetch));
    await renderEntry();
    await userEvent.setup().press(screen.getByText('Try again'));
    expect(refetch).toHaveBeenCalled();
  });
});
