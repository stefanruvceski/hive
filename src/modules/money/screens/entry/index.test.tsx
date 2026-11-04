import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyEntry } from './index';
import {
  useActiveSpace,
  useCategories,
  useDeleteEntry,
  useEntries,
  useItems,
  useRates,
  useSaveEntry,
} from '../../data/queries';
import { category, entry, failed, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
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
  jest.mocked(useActiveSpace).mockReturnValue(loaded('private'));
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
    expect(screen.getByTestId('money-entry-rate').props.value).toBe('117.2');
    expect(screen.getByTestId('money-entry-rsd')).toHaveTextContent(/1,172\.00 RSD/);
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

  it('saves a payout without a category and says what it does', async () => {
    await renderEntry();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-entry-kind-payout'));
    expect(screen.getByTestId('money-entry-payout-hint')).toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-category-food')).not.toBeOnTheScreen();
    await user.type(screen.getByTestId('money-entry-amount'), '1000');
    await user.press(screen.getByTestId('money-entry-save'));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'payout', categoryId: null, amountMinor: 100000 }),
      expect.anything(),
    );
  });

  it('splits an entry into items that must add up to the total', async () => {
    await renderEntry();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-entry-amount'), '100');
    await user.press(screen.getByTestId('money-entry-item-add'));
    await user.type(screen.getByTestId('money-entry-item-name-0'), 'Milk');
    await user.type(screen.getByTestId('money-entry-item-amount-0'), '60');
    await user.press(screen.getByTestId('money-entry-save'));
    expect(screen.getByTestId('money-entry-error')).toHaveTextContent(/differ/);

    await user.press(screen.getByTestId('money-entry-item-add'));
    await user.type(screen.getByTestId('money-entry-item-name-1'), 'Bread');
    await user.type(screen.getByTestId('money-entry-item-amount-1'), '40');
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
