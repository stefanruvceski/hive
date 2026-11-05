import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoneyRate } from './index';
import { useSaveRate } from '../../data/queries';
import { metrics } from '../test-data';

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
      <MoneyRate />
    </SafeAreaProvider>,
  );

describe('MoneyRate', () => {
  it('saves a rate for a currency and a day, then goes back', async () => {
    save.mockImplementation((_r: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-rate-currency-USD'));
    await user.type(screen.getByTestId('money-rate-rate'), '108,5');
    await user.press(screen.getByTestId('money-rate-save'));
    expect(save).toHaveBeenCalledWith(
      { currency: 'USD', date: '2026-11-02', rate: 108.5 },
      expect.anything(),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('rejects a bad rate or date', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('money-rate-save'));
    expect(screen.getByTestId('money-rate-error')).toHaveTextContent(/rate/);
    await user.type(screen.getByTestId('money-rate-rate'), '117');
    await user.clear(screen.getByTestId('money-rate-date'));
    await user.type(screen.getByTestId('money-rate-date'), 'soon');
    await user.press(screen.getByTestId('money-rate-save'));
    expect(screen.getByTestId('money-rate-error')).toHaveTextContent(/date/);
    expect(save).not.toHaveBeenCalled();
  });
});
