import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';

import { HabitsHome } from './index';
import { type Habit, useCompletions, useHabits, useSetCompletion } from '../../data/queries';

// The database boundary: the module's query hooks (09 §5). Domain logic is tested without mocks.
jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const mockedHabits = jest.mocked(useHabits);
const mockedCompletions = jest.mocked(useCompletions);
const mockedSetCompletion = jest.mocked(useSetCompletion);
const result = (value: object) => value as ReturnType<typeof useHabits>;
const completions = (value: object) => value as ReturnType<typeof useCompletions>;
const mutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockedCompletions.mockReturnValue(completions({ data: [], refetch: jest.fn() }));
  mockedSetCompletion.mockReturnValue({ mutate } as unknown as ReturnType<typeof useSetCompletion>);
});

const habit = (id: string, name: string, timeOfDay: Habit['timeOfDay'], position: number) => ({
  id,
  name,
  emoji: '📚',
  timeOfDay,
  position,
  createdAt: '2026-11-01',
});

// Expo Router provides safe areas in the app; tests give a phone-sized frame.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderHabits = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsHome />
    </SafeAreaProvider>,
  );

describe('HabitsHome', () => {
  it('lists habits under their part of the day, in day order and the order they were added', async () => {
    mockedHabits.mockReturnValue(
      result({
        data: [
          habit('read', 'Read 10 pages', 'evening', 2),
          habit('run', 'Morning run', 'morning', 0),
          habit('stretch', 'Stretch', 'morning', 1),
        ],
      }),
    );
    await renderHabits();

    const headings = screen.getAllByRole('heading').map((h) => h.props.children);
    expect(headings).toEqual(['Habits', 'Morning', 'Evening']);
    const morning = within(screen.getByTestId('habits-section-morning'));
    expect(morning.getAllByText(/Morning run|Stretch/).map((t) => t.props.children)).toEqual([
      'Morning run',
      'Stretch',
    ]);
    expect(
      within(screen.getByTestId('habits-section-evening')).getByText('Read 10 pages'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('habits-section-afternoon')).not.toBeOnTheScreen();
  });

  it('opens the Add habit form from the header', async () => {
    mockedHabits.mockReturnValue(result({ data: [habit('run', 'Run', 'morning', 0)] }));
    await renderHabits();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Add habit' }));
    expect(router.push).toHaveBeenCalledWith('/habits/new');
  });

  it('shows an empty state with an "Add habit" button when there are no habits', async () => {
    mockedHabits.mockReturnValue(result({ data: [] }));
    await renderHabits();

    expect(screen.getByTestId('habits-empty')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('habits-empty-add'));
    expect(router.push).toHaveBeenCalledWith('/habits/new');
  });

  it('shows a loading state while the habits load', async () => {
    mockedHabits.mockReturnValue(result({ isPending: true }));
    await renderHabits();

    expect(screen.getByTestId('habits-loading')).toBeOnTheScreen();
  });

  it('shows a retryable error with friendly copy', async () => {
    const refetch = jest.fn();
    mockedHabits.mockReturnValue(
      result({ isError: true, error: new ApiError(500, 'SELECT failed'), refetch }),
    );
    await renderHabits();

    expect(screen.queryByText(/SELECT failed/)).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('habits-error-retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('keeps showing the list when a later refetch fails', async () => {
    mockedHabits.mockReturnValue(
      result({ data: [habit('run', 'Run', 'morning', 0)], isError: true, error: new Error('x') }),
    );
    await renderHabits();

    expect(screen.getByText('Run')).toBeOnTheScreen();
    expect(screen.queryByTestId('habits-error')).not.toBeOnTheScreen();
  });

  describe('done today and streaks', () => {
    // Midday on 1 November 2026 in the phone's time zone; userEvent moves the fake clock along.
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date(2026, 10, 1, 12) });
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const check = (name: string) => screen.getByRole('checkbox', { name: `Done today: ${name}` });

    beforeEach(() => {
      mockedHabits.mockReturnValue(
        result({
          data: [
            habit('run', 'Run', 'morning', 0),
            habit('read', 'Read', 'evening', 1),
            habit('water', 'Water', 'anytime', 2),
          ],
        }),
      );
      mockedCompletions.mockReturnValue(
        completions({
          data: [
            { habitId: 'run', date: '2026-11-01' },
            { habitId: 'run', date: '2026-10-31' },
            { habitId: 'run', date: '2026-10-30' },
            { habitId: 'read', date: '2026-10-31' },
            { habitId: 'read', date: '2026-10-30' },
            { habitId: 'water', date: '2026-10-30' },
          ],
        }),
      );
    });

    it('shows whether each habit is done today and its streak', async () => {
      await renderHabits();

      expect(check('Run')).toBeChecked();
      expect(screen.getByTestId('habits-streak-run')).toHaveTextContent('Streak: 3 days');
      // Not done yet today: yesterday's streak still counts, the day isn't over.
      expect(check('Read')).not.toBeChecked();
      expect(screen.getByTestId('habits-streak-read')).toHaveTextContent('Streak: 2 days');
      // Missed yesterday: back to 0 until it is done today.
      expect(check('Water')).not.toBeChecked();
      expect(screen.getByTestId('habits-streak-water')).toHaveTextContent('Streak: 0 days');
    });

    it('says "1 day" for a streak of one', async () => {
      mockedCompletions.mockReturnValue(
        completions({ data: [{ habitId: 'water', date: '2026-11-01' }] }),
      );
      await renderHabits();

      expect(screen.getByTestId('habits-streak-water')).toHaveTextContent('Streak: 1 day');
    });

    it('marks a habit done today, and not done when tapped again', async () => {
      await renderHabits();

      await user().press(check('Read'));
      expect(mutate).toHaveBeenLastCalledWith(
        { habitId: 'read', date: '2026-11-01', done: true },
        expect.anything(),
      );
      await user().press(check('Run'));
      expect(mutate).toHaveBeenLastCalledWith(
        { habitId: 'run', date: '2026-11-01', done: false },
        expect.anything(),
      );
    });

    it('marks the day it shows after midnight passes with the screen open', async () => {
      await renderHabits();

      await act(() => jest.advanceTimersByTime(12 * 60 * 60 * 1000));
      await user().press(check('Run'));
      expect(mutate).toHaveBeenLastCalledWith(
        { habitId: 'run', date: '2026-11-02', done: true },
        expect.anything(),
      );
    });

    it('offers to try again when saving fails', async () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      mutate.mockImplementation((_change, options?: { onError?: () => void }) =>
        options?.onError?.(),
      );
      await renderHabits();

      await user().press(check('Read'));
      expect(alert).toHaveBeenCalledWith("Couldn't save", expect.any(String), expect.any(Array));
      const buttons = alert.mock.lastCall?.[2] ?? [];
      const tryAgain = buttons.find((button) => button.text === 'Try again');
      mutate.mockReset();
      await act(() => tryAgain?.onPress?.());
      expect(mutate).toHaveBeenCalledWith(
        { habitId: 'read', date: '2026-11-01', done: true },
        expect.anything(),
      );
      alert.mockRestore();
    });
  });

  it('shows a retryable error when the done days fail to load', async () => {
    const refetchHabits = jest.fn();
    const refetchCompletions = jest.fn();
    mockedHabits.mockReturnValue(
      result({ data: [habit('run', 'Run', 'morning', 0)], refetch: refetchHabits }),
    );
    mockedCompletions.mockReturnValue(
      completions({ isError: true, error: new Error('x'), refetch: refetchCompletions }),
    );
    await renderHabits();

    expect(screen.queryByText('Run')).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('habits-error-retry'));
    expect(refetchHabits).toHaveBeenCalled();
    expect(refetchCompletions).toHaveBeenCalled();
  });

  it('keeps loading until the done days are read', async () => {
    mockedHabits.mockReturnValue(result({ data: [habit('run', 'Run', 'morning', 0)] }));
    mockedCompletions.mockReturnValue(completions({ isPending: true }));
    await renderHabits();

    expect(screen.getByTestId('habits-loading')).toBeOnTheScreen();
  });

  // Home is under every deep link (`unstable_settings.anchor` in src/app/_layout.tsx).
  it('goes back to Home', async () => {
    mockedHabits.mockReturnValue(result({ data: [] }));
    await renderHabits();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Back' }));
    expect(router.back).toHaveBeenCalled();
  });
});
