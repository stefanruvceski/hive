import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyHome } from './index';
import { useActiveSpace, useCategories, useEntries, useSetSpace } from '../../data/queries';
import { useGenerateRecurring } from '../../data/recurring-queries';
import { category, entry, failed, loaded, metrics, pending } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/recurring-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Monday 2 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const setSpace = jest.fn();
const generate = jest.fn();

const show = (entries: unknown, space: 'private' | 'business' = 'private') => {
  jest.mocked(useEntries).mockReturnValue(entries as never);
  jest.mocked(useCategories).mockReturnValue(loaded([category('food', { name: 'Food' })]));
  jest.mocked(useActiveSpace).mockReturnValue(loaded(space));
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSetSpace).mockReturnValue({ mutate: setSpace } as never);
  jest.mocked(useGenerateRecurring).mockReturnValue({ mutate: generate } as never);
});

const renderHome = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyHome />
    </SafeAreaProvider>,
  );

describe('MoneyHome', () => {
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
        entry('c', { space: 'business' }),
        entry('d', { date: '2026-10-30' }),
      ]),
    );
    await renderHome();

    expect(screen.getByTestId('money-month-label')).toHaveTextContent('November 2026');
    expect(screen.getByTestId('money-total-income')).toHaveTextContent(/5,000\.00 RSD/);
    expect(screen.getByTestId('money-total-expense')).toHaveTextContent(/1,200\.00 RSD/);
    expect(screen.getByTestId('money-total-balance')).toHaveTextContent(/\+3,800\.00 RSD/);
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

    expect(screen.getByTestId('money-entry-a')).toHaveTextContent(/1,170\.00 RSD/);
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
    await user.press(screen.getByTestId('money-budgets-open'));
    expect(router.push).toHaveBeenCalledWith('/money/budgets');
    await user.press(screen.getByTestId('money-overview-open'));
    expect(router.push).toHaveBeenCalledWith('/money/overview');
  });

  it('switches space and month', async () => {
    show(loaded([entry('d', { date: '2026-10-30' })]));
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-space-business'));
    expect(setSpace).toHaveBeenCalledWith('business');
    await user.press(screen.getByTestId('money-month-prev'));
    expect(screen.getByTestId('money-month-label')).toHaveTextContent('October 2026');
    expect(screen.getByTestId('money-entry-d')).toBeOnTheScreen();
    expect(screen.getByTestId('money-month-next')).toBeEnabled();
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
