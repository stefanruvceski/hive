import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyRule } from './index';
import { useBusinesses } from '../../data/business-queries';
import { useActiveView, useSetView, useCategories } from '../../data/queries';
import { useRecurring, useSaveRule } from '../../data/recurring-queries';
import { category, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/business-queries');
jest.mock('../../data/recurring-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Monday 2 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const save = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRecurring).mockReturnValue(loaded([]));
  jest
    .mocked(useCategories)
    .mockReturnValue(
      loaded([
        category('food', { name: 'Food' }),
        category('salary', { name: 'Salary', kind: 'income' }),
      ]),
    );
  jest.mocked(useActiveView).mockReturnValue(loaded('private'));
  jest.mocked(useBusinesses).mockReturnValue(loaded([]));
  jest.mocked(useSetView).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useSaveRule).mockReturnValue({ mutate: save } as never);
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyRule />
    </SafeAreaProvider>,
  );

describe('MoneyRule', () => {
  it('saves a monthly income rule', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-rule-kind-income'));
    await user.type(screen.getByTestId('money-rule-amount'), '80000');
    await user.press(screen.getByTestId('money-rule-category-salary'));
    await user.clear(screen.getByTestId('money-rule-day'));
    await user.type(screen.getByTestId('money-rule-day'), '5');
    await user.press(screen.getByTestId('money-rule-save'));

    expect(save).toHaveBeenCalledWith(
      {
        id: undefined,
        space: 'private',
        businessId: null,
        kind: 'income',
        amountMinor: 8000000,
        currency: 'RSD',
        categoryId: 'salary',
        note: '',
        frequency: 'monthly',
        day: 5,
        startDate: '2026-11-02',
      },
      expect.anything(),
    );
  });

  it('checks the amount, category and day', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-rule-save'));
    expect(screen.getByTestId('money-rule-error')).toHaveTextContent(/amount/);
    await user.type(screen.getByTestId('money-rule-amount'), '10');
    await user.press(screen.getByTestId('money-rule-save'));
    expect(screen.getByTestId('money-rule-error')).toHaveTextContent(/category/);
    await user.press(screen.getByTestId('money-rule-category-food'));
    await user.press(screen.getByTestId('money-rule-frequency-weekly'));
    await user.clear(screen.getByTestId('money-rule-day'));
    await user.type(screen.getByTestId('money-rule-day'), '9');
    await user.press(screen.getByTestId('money-rule-save'));
    expect(screen.getByTestId('money-rule-error')).toHaveTextContent(/Weekday/);
    expect(save).not.toHaveBeenCalled();
  });
});
