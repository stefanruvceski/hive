import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyBudgets } from './index';
import { useBudgets, useSetBudget } from '../../data/budget-queries';
import { useBusinesses } from '../../data/business-queries';
import { useActiveView, useSetView, useCategories, useEntries, useItems } from '../../data/queries';
import { category, entry, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/business-queries');
jest.mock('../../data/budget-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const setBudget = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useEntries)
    .mockReturnValue(
      loaded([
        entry('a', { amountRsdMinor: 9000, amountMinor: 9000 }),
        entry('b', { amountRsdMinor: 5000, amountMinor: 5000, date: '2026-10-15' }),
      ]),
    );
  jest.mocked(useItems).mockReturnValue(loaded([]));
  jest
    .mocked(useCategories)
    .mockReturnValue(
      loaded([category('food', { name: 'Food' }), category('fun', { name: 'Fun' })]),
    );
  jest
    .mocked(useBudgets)
    .mockReturnValue(loaded([{ categoryId: 'food', fromMonth: '2026-09', limitMinor: 10000 }]));
  jest.mocked(useActiveView).mockReturnValue(loaded('private'));
  jest.mocked(useBusinesses).mockReturnValue(loaded([]));
  jest.mocked(useSetView).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useSetBudget).mockReturnValue({ mutate: setBudget } as never);
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyBudgets />
    </SafeAreaProvider>,
  );

describe('MoneyBudgets', () => {
  it("shows this month's spending against the limit in force", async () => {
    await renderScreen();
    expect(screen.getByTestId('money-budget-status-food')).toHaveTextContent(/90 RSD of 100 RSD/);
    expect(screen.getByTestId('money-budget-status-fun')).toHaveTextContent(/0 RSD spent/);
  });

  it('saves a new limit from this month on', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByTestId('money-budget-input-fun'), '250');
    await fireEvent(screen.getByTestId('money-budget-input-fun'), 'endEditing');
    expect(setBudget).toHaveBeenCalledWith({
      categoryId: 'fun',
      fromMonth: '2026-11',
      limitMinor: 25000,
    });
  });

  it('clearing the field removes the limit', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.clear(screen.getByTestId('money-budget-input-food'));
    await fireEvent(screen.getByTestId('money-budget-input-food'), 'endEditing');
    expect(setBudget).toHaveBeenCalledWith({
      categoryId: 'food',
      fromMonth: '2026-11',
      limitMinor: 0,
    });
  });
});
