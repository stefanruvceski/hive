import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyOverview } from './index';
import { useBusinesses } from '../../data/business-queries';
import { useActiveView, useSetView, useCategories, useEntries, useItems } from '../../data/queries';
import { category, entry, loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('../../data/business-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const show = (entries: unknown[]) => {
  jest.mocked(useEntries).mockReturnValue(loaded(entries));
  jest.mocked(useItems).mockReturnValue(loaded([]));
  jest
    .mocked(useCategories)
    .mockReturnValue(
      loaded([category('food', { name: 'Food' }), category('fun', { name: 'Fun' })]),
    );
  jest.mocked(useActiveView).mockReturnValue(loaded('private'));
  jest.mocked(useBusinesses).mockReturnValue(loaded([]));
  jest.mocked(useSetView).mockReturnValue({ mutate: jest.fn() } as never);
};

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyOverview />
    </SafeAreaProvider>,
  );

describe('MoneyOverview', () => {
  it('breaks the month down by category', async () => {
    show([
      entry('a', { amountRsdMinor: 7500, amountMinor: 7500 }),
      entry('b', { categoryId: 'fun', amountRsdMinor: 2500, amountMinor: 2500 }),
      entry('c', { space: 'business', amountRsdMinor: 99900 }),
    ]);
    await renderScreen();

    expect(screen.getByTestId('money-overview-spent')).toHaveTextContent(/100\.00 RSD/);
    expect(screen.getByTestId('money-overview-category-food')).toHaveTextContent(/75%/);
    expect(screen.getByTestId('money-overview-category-fun')).toHaveTextContent(/25%/);
  });

  it('says so when a period is empty', async () => {
    show([]);
    await renderScreen();
    expect(screen.getByTestId('money-overview-empty')).toBeOnTheScreen();
  });

  it('draws the year and states its totals as text', async () => {
    show([
      entry('a', { amountRsdMinor: 7500, amountMinor: 7500, date: '2026-03-10' }),
      entry('b', {
        kind: 'income',
        categoryId: 'food',
        amountRsdMinor: 20000,
        amountMinor: 20000,
        date: '2026-04-01',
      }),
    ]);
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-overview-mode-year'));
    expect(screen.getByTestId('money-overview-label')).toHaveTextContent('2026');
    expect(screen.getByTestId('money-overview-chart')).toBeOnTheScreen();
    expect(screen.getByTestId('money-overview-year-summary')).toHaveTextContent(
      /Income 200\.00 RSD, spent 75\.00 RSD/,
    );
  });

  it('moves between months but not past the current one', async () => {
    show([entry('a')]);
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByTestId('money-overview-next')).toBeDisabled();
    await user.press(screen.getByTestId('money-overview-prev'));
    expect(screen.getByTestId('money-overview-label')).toHaveTextContent('October 2026');
  });
});
