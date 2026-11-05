import { render, screen, userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

import { MoneyHome } from './index';
import { useBusinesses } from '../../data/business-queries';
import { useActiveView, useCategories, useEntries, useSetView } from '../../data/queries';
import { useReceiptSync } from '../../data/receipt-import';
import { useGenerateRecurring } from '../../data/recurring-queries';
import type { Business } from '../../domain/owners';
import { business, category, entry, failed, loaded, metrics, pending } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/business-queries');
jest.mock('../../data/receipt-import');
jest.mock('../../data/recurring-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Monday 2 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const setView = jest.fn();
const generate = jest.fn();

const show = (entries: unknown, view = 'private', businesses: Business[] = []) => {
  jest.mocked(useEntries).mockReturnValue(entries as never);
  jest.mocked(useCategories).mockReturnValue(loaded([category('food', { name: 'Food' })]));
  jest.mocked(useActiveView).mockReturnValue(loaded(view));
  jest.mocked(useBusinesses).mockReturnValue(loaded(businesses));
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSetView).mockReturnValue({ mutate: setView } as never);
  jest.mocked(useGenerateRecurring).mockReturnValue({ mutate: generate } as never);
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

describe('MoneyHome', () => {
  it('shows a negative balance in red with a minus and no plus on a positive one', async () => {
    show(loaded([entry('a', { amountMinor: 120000, amountRsdMinor: 120000 })]));
    await renderHome();

    const balance = screen.getByTestId('money-total-balance');
    expect(balance).toHaveTextContent(/−1,200/);
    expect(within(balance).getByText('−1,200')).toHaveStyle({ color: Colors.light.danger });
  });

  it('lists the month of the open space, newest day first, with totals', async () => {
    show(
      loaded([
        entry('a', { amountMinor: 120000, amountRsdMinor: 120000, date: '2026-11-01' }),
        entry('b', {
          kind: 'income',
          categoryId: 'food',
          amountMinor: 500000,
          amountRsdMinor: 500000,
        }),
        entry('c', { space: 'business', businessId: 'b1' }),
        entry('d', { date: '2026-10-30' }),
      ]),
    );
    await renderHome();

    expect(screen.getByTestId('money-month-label')).toHaveTextContent('November 2026');
    expect(screen.getByTestId('money-total-income')).toHaveTextContent(/5,000/);
    expect(screen.getByTestId('money-total-expense')).toHaveTextContent(/1,200/);
    expect(screen.getByTestId('money-total-balance')).toHaveTextContent(/3,800/);
    expect(screen.getByTestId('money-entry-a')).toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-c')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-d')).not.toBeOnTheScreen();
  });

  it('shows the amount in its own currency with the RSD value under it', async () => {
    show(
      loaded([
        entry('a', { currency: 'EUR', amountMinor: 1000, rate: 117, amountRsdMinor: 117000 }),
      ]),
    );
    await renderHome();

    expect(screen.getByTestId('money-entry-a')).toHaveTextContent(/1,170 RSD/);
    expect(screen.getByTestId('money-entry-a')).toHaveTextContent(/10\.00 EUR/);
  });

  it('opens an entry and the other screens', async () => {
    show(loaded([entry('a')]));
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-entry-a'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/money/entry', params: { id: 'a' } });
    await user.press(screen.getByTestId('money-add'));
    expect(router.push).toHaveBeenCalledWith('/money/entry');
    await user.press(screen.getByTestId('money-settings-open'));
    expect(router.push).toHaveBeenCalledWith('/money/settings');
    await user.press(screen.getByTestId('money-overview-open'));
    expect(router.push).toHaveBeenCalledWith('/money/overview');
  });

  it('switches view and month', async () => {
    show(loaded([entry('d', { date: '2026-10-30' })]), 'private', [
      business('b1', { name: 'Shop' }),
    ]);
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-view-b1'));
    expect(setView).toHaveBeenCalledWith('b1');
    await user.press(screen.getByTestId('money-month-prev'));
    expect(screen.getByTestId('money-month-label')).toHaveTextContent('October 2026');
    expect(screen.getByTestId('money-entry-d')).toBeOnTheScreen();
    expect(screen.getByTestId('money-month-next')).toBeEnabled();
  });

  it('shows no view chips until there is a business', async () => {
    show(loaded([entry('a')]));
    await renderHome();
    expect(screen.queryByTestId('money-view-all')).not.toBeOnTheScreen();
  });

  it('shows one business only, or everything with an owner under each entry', async () => {
    const shop = business('b1', { name: 'Shop' });
    const rows = loaded([
      entry('p', { note: 'Rent' }),
      entry('f', { space: 'business', businessId: 'b1', note: 'Diesel' }),
      entry('g', { space: 'business', businessId: 'b2', note: 'Other firm' }),
    ]);
    show(rows, 'b1', [shop, business('b2')]);
    const view = await renderHome();
    expect(screen.getByTestId('money-entry-f')).toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-p')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('money-entry-g')).not.toBeOnTheScreen();
    await view.unmount();

    show(rows, 'all', [shop, business('b2')]);
    await renderHome();
    expect(screen.getByTestId('money-entry-p')).toHaveTextContent(/Private · Rent/);
    expect(screen.getByTestId('money-entry-f')).toHaveTextContent(/Shop · Diesel/);
  });

  it('names the business a payout comes from', async () => {
    show(
      loaded([
        entry('x', { kind: 'payout', categoryId: null, space: 'business', businessId: 'b1' }),
      ]),
      'b1',
      [business('b1', { name: 'Shop' })],
    );
    await renderHome();
    expect(screen.getByTestId('money-entry-x')).toHaveTextContent(/Payout Shop → Private/);
  });

  it('does not go past the current month', async () => {
    show(loaded([]));
    await renderHome();
    expect(screen.getByTestId('money-month-next')).toBeDisabled();
  });

  it('creates the entries recurring rules owe when it opens', async () => {
    show(loaded([]));
    await renderHome();
    expect(generate).toHaveBeenCalledWith('2026-11-02');
  });

  it('shows an empty state with an add button', async () => {
    show(loaded([]));
    await renderHome();
    expect(screen.getByTestId('money-empty')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('money-empty-add'));
    expect(router.push).toHaveBeenCalledWith('/money/entry');
  });

  it('shows loading, then an error with retry', async () => {
    show(pending());
    const view = await renderHome();
    expect(screen.getByTestId('money-loading')).toBeOnTheScreen();
    await view.unmount();

    const refetch = jest.fn();
    show(failed(refetch));
    await renderHome();
    await userEvent.setup().press(screen.getByText('Try again'));
    expect(refetch).toHaveBeenCalled();
  });
});
