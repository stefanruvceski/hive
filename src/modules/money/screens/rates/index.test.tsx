import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyRates } from './index';
import { useRates } from '../../data/queries';
import { loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MoneyRates />
    </SafeAreaProvider>,
  );

describe('MoneyRates', () => {
  it('shows the latest rate of each currency', async () => {
    jest.mocked(useRates).mockReturnValue(
      loaded([
        { currency: 'EUR', date: '2026-10-01', rate: 117, source: 'manual' },
        { currency: 'EUR', date: '2026-10-20', rate: 117.2, source: 'manual' },
      ]),
    );
    await renderScreen();
    expect(screen.getByTestId('money-rate-EUR')).toHaveTextContent(/117\.2 RSD/);
  });

  it('says there are no rates yet', async () => {
    jest.mocked(useRates).mockReturnValue(loaded([]));
    await renderScreen();
    expect(screen.getByTestId('money-rates-empty')).toBeOnTheScreen();
  });

  it('has no form of its own: the + opens a new rate', async () => {
    jest.mocked(useRates).mockReturnValue(loaded([]));
    await renderScreen();

    expect(screen.queryByTestId('money-rate-rate')).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('money-rates-add'));
    expect(router.push).toHaveBeenCalledWith('/money/rate');
  });
});
