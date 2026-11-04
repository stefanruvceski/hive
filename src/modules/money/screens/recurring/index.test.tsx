import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyRecurring } from './index';
import { useCategories } from '../../data/queries';
import { type Rule, useRecurring, useStopRule } from '../../data/recurring-queries';
import { category, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/recurring-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const stop = jest.fn();
const rule = (id: string, extra: Partial<Rule> = {}) =>
  ({
    id,
    space: 'private',
    kind: 'income',
    amountMinor: 8000000,
    currency: 'RSD',
    categoryId: 'salary',
    note: '',
    frequency: 'monthly',
    day: 5,
    startDate: '2026-01-05',
    endDate: null,
    ...extra,
  }) as Rule;

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useCategories)
    .mockReturnValue(loaded([category('salary', { name: 'Salary', kind: 'income', emoji: '💼' })]));
  jest.mocked(useStopRule).mockReturnValue({ mutate: stop } as never);
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyRecurring />
    </SafeAreaProvider>,
  );

describe('MoneyRecurring', () => {
  it('describes each rule and opens it', async () => {
    jest
      .mocked(useRecurring)
      .mockReturnValue(loaded([rule('r1'), rule('r2', { frequency: 'weekly', day: 1 })]));
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByTestId('money-rule-edit-r1')).toHaveTextContent(/Monthly on day 5/);
    expect(screen.getByTestId('money-rule-edit-r2')).toHaveTextContent(/Every Monday/);
    await user.press(screen.getByTestId('money-rule-edit-r1'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/money/rule', params: { id: 'r1' } });
  });

  it('stops a rule from today and lets a stopped one run again', async () => {
    jest
      .mocked(useRecurring)
      .mockReturnValue(loaded([rule('r1'), rule('r2', { endDate: '2026-10-01' })]));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-rule-stop-r1'));
    expect(stop).toHaveBeenCalledWith({ id: 'r1', endDate: '2026-11-02' });
    await user.press(screen.getByTestId('money-rule-stop-r2'));
    expect(stop).toHaveBeenCalledWith({ id: 'r2', endDate: null });
  });

  it('shows an empty state, and Add opens the form', async () => {
    jest.mocked(useRecurring).mockReturnValue(loaded([]));
    await renderScreen();
    expect(screen.getByTestId('money-recurring-empty')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('money-recurring-add'));
    expect(router.push).toHaveBeenCalledWith('/money/rule');
  });
});
