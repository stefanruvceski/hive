import { render, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsMonth } from './index';
import { useMonthCompletions, useSetMonthCompletion } from '../../data/month-queries';
import { useHabits } from '../../data/queries';

// The database boundary: the module's query hooks (09 §5). Domain logic is tested without mocks.
jest.mock('../../data/queries');
jest.mock('../../data/month-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-12' }));

const mockedHabits = jest.mocked(useHabits);
const mockedCompletions = jest.mocked(useMonthCompletions);
const mockedSet = jest.mocked(useSetMonthCompletion);
const mutate = jest.fn();

const habit = (id: string, name: string) => ({
  id,
  name,
  emoji: '📚',
  timeOfDay: 'morning',
  position: 0,
  createdAt: '2026-10-01',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedHabits.mockReturnValue({
    data: [habit('read', 'Read')],
  } as unknown as ReturnType<typeof useHabits>);
  mockedCompletions.mockReturnValue({
    data: [{ habitId: 'read', date: '2026-11-03' }],
  } as ReturnType<typeof useMonthCompletions>);
  mockedSet.mockReturnValue({ mutate } as unknown as ReturnType<typeof useSetMonthCompletion>);
});

// Expo Router provides safe areas in the app; tests give a phone-sized frame.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderMonth = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsMonth />
    </SafeAreaProvider>,
  );

const cell = (date: string) => screen.getByTestId(`habits-month-cell-read-${date}`);

describe('HabitsMonth', () => {
  it('shows the current month as the heading, with today highlighted', async () => {
    await renderMonth();

    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeOnTheScreen();
    expect(within(screen.getByTestId('habits-month-today')).getByText('12')).toBeOnTheScreen();
    expect(mockedCompletions).toHaveBeenLastCalledWith({ year: 2026, month: 11 });
  });

  it('draws a row per habit and a done cell for each completion', async () => {
    await renderMonth();

    expect(screen.getByText(/Read/)).toBeOnTheScreen();
    expect(cell('2026-11-03')).toBeChecked();
    expect(cell('2026-11-04')).not.toBeChecked();
  });

  it('toggles a past or current day', async () => {
    const user = userEvent.setup();
    await renderMonth();

    await user.press(cell('2026-11-04'));
    expect(mutate).toHaveBeenLastCalledWith(
      { habitId: 'read', date: '2026-11-04', done: true },
      expect.anything(),
    );
    await user.press(cell('2026-11-03'));
    expect(mutate).toHaveBeenLastCalledWith(
      { habitId: 'read', date: '2026-11-03', done: false },
      expect.anything(),
    );
    await user.press(cell('2026-11-12'));
    expect(mutate).toHaveBeenLastCalledWith(
      { habitId: 'read', date: '2026-11-12', done: true },
      expect.anything(),
    );
  });

  it('does not toggle a future day', async () => {
    await renderMonth();

    expect(cell('2026-11-13')).toBeDisabled();
    await userEvent.setup().press(cell('2026-11-13'));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('goes back a month, and forward again but never past the current month', async () => {
    const user = userEvent.setup();
    await renderMonth();

    expect(screen.getByTestId('habits-month-next')).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeOnTheScreen();
    expect(mockedCompletions).toHaveBeenLastCalledWith({ year: 2026, month: 10 });
    expect(cell('2026-10-31')).toBeEnabled();

    await user.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeOnTheScreen();
    expect(screen.getByTestId('habits-month-next')).toBeDisabled();
  });

  it('offers a retry when saving fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mutate.mockImplementation((_change, options) => options.onError());
    await renderMonth();

    await userEvent.setup().press(cell('2026-11-04'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Couldn't save", expect.any(String), expect.any(Array)),
    );
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    buttons.find((button) => button.text === 'Try again')?.onPress?.();
    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state without habits', async () => {
    mockedHabits.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useHabits>);
    await renderMonth();

    expect(screen.getByTestId('habits-month-empty')).toBeOnTheScreen();
  });

  it('shows a loading state, then an error', async () => {
    mockedHabits.mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useHabits>);
    mockedCompletions.mockReturnValue({ data: undefined } as ReturnType<
      typeof useMonthCompletions
    >);
    const view = await renderMonth();
    expect(screen.getByTestId('habits-month-loading')).toBeOnTheScreen();

    mockedHabits.mockReturnValue({
      data: undefined,
      isError: true,
      error: new Error('x'),
    } as unknown as ReturnType<typeof useHabits>);
    await view.rerender(
      <SafeAreaProvider initialMetrics={metrics}>
        <HabitsMonth />
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('habits-month-error')).toBeOnTheScreen();
  });

  it('goes back', async () => {
    await renderMonth();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Back' }));
    expect(router.back).toHaveBeenCalled();
  });
});
