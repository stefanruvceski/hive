import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyRates } from './index';
import { useRates, useSaveRate } from '../../data/queries';
import { loaded, metrics } from '../test-data';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const save = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSaveRate).mockReturnValue({ mutate: save } as never);
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

  it('saves a rate for a currency and a day', async () => {
    jest.mocked(useRates).mockReturnValue(loaded([]));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-rates-currency-USD'));
    await user.type(screen.getByTestId('money-rates-rate'), '108,5');
    await user.press(screen.getByTestId('money-rates-save'));
    expect(save).toHaveBeenCalledWith(
      { currency: 'USD', date: '2026-11-02', rate: 108.5 },
      expect.anything(),
    );
  });

  it('rejects a bad rate or date', async () => {
    jest.mocked(useRates).mockReturnValue(loaded([]));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-rates-save'));
    expect(screen.getByTestId('money-rates-error')).toHaveTextContent(/rate/);
    await user.type(screen.getByTestId('money-rates-rate'), '117');
    await user.clear(screen.getByTestId('money-rates-date'));
    await user.type(screen.getByTestId('money-rates-date'), 'soon');
    await user.press(screen.getByTestId('money-rates-save'));
    expect(screen.getByTestId('money-rates-error')).toHaveTextContent(/date/);
    expect(save).not.toHaveBeenCalled();
  });
});
