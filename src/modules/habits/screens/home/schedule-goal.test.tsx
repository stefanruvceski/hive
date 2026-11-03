import { render, screen, userEvent, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsHome } from './index';
import {
  type Habit,
  useArchivedHabits,
  useCompletions,
  useHabits,
  useSetAmount,
  useSetCompletion,
} from '../../data/queries';
import { useReorder } from '../../data/reorder-queries';
import {
  useAddTodo,
  useDeleteTodo,
  useMoveTodo,
  useToggleTodo,
  useTodos,
} from '../../data/todo-queries';

jest.mock('../../data/queries');
jest.mock('../../data/reorder-queries');
jest.mock('../../data/todo-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Monday 2 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const logAmount = jest.fn();

const habit = (id: string, extra: Partial<Habit> = {}) =>
  ({
    id,
    name: id,
    emoji: '🎯',
    timeOfDay: 'anytime',
    position: 0,
    createdAt: '2026-10-01',
    scheduleType: 'daily',
    scheduleDays: null,
    scheduleTimes: null,
    unit: null,
    target: null,
    ...extra,
  }) as Habit;

const show = (habits: Habit[], completions: object[] = []) => {
  jest.mocked(useHabits).mockReturnValue({ data: habits } as never);
  jest.mocked(useCompletions).mockReturnValue({ data: completions, refetch: jest.fn() } as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTodos).mockReturnValue({ data: [] } as never);
  for (const hook of [useAddTodo, useToggleTodo, useDeleteTodo, useMoveTodo]) {
    jest.mocked(hook).mockReturnValue({ mutate: jest.fn() } as never);
  }
  jest.mocked(useSetCompletion).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useSetAmount).mockReturnValue({ mutate: logAmount } as never);
  jest.mocked(useReorder).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useArchivedHabits).mockReturnValue({ data: [] } as never);
});

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

describe('HabitsHome schedules', () => {
  it('puts a habit that is not due today under "Not today", at the end', async () => {
    show([habit('gym', { scheduleType: 'weekdays', scheduleDays: '2,4' }), habit('read')]);
    await renderHabits();

    const notToday = within(screen.getByTestId('habits-section-not-today'));
    expect(notToday.getByText('gym')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('habits-section-anytime')).queryByText('gym'),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('Not today')).toBeOnTheScreen();
  });

  it('keeps a habit due today in its part of the day', async () => {
    show([habit('gym', { scheduleType: 'weekdays', scheduleDays: '1' })]);
    await renderHabits();

    expect(screen.queryByTestId('habits-section-not-today')).not.toBeOnTheScreen();
    expect(within(screen.getByTestId('habits-section-anytime')).getByText('gym')).toBeOnTheScreen();
  });

  it('shows the week so far and a streak in weeks for a weekly habit', async () => {
    show(
      [habit('run', { scheduleType: 'weekly', scheduleTimes: 3 })],
      [
        { habitId: 'run', date: '2026-10-26' },
        { habitId: 'run', date: '2026-10-27' },
        { habitId: 'run', date: '2026-10-28' },
        { habitId: 'run', date: '2026-11-02' },
      ],
    );
    await renderHabits();

    expect(screen.getByTestId('habits-note-run')).toHaveTextContent('1 of 3 this week');
    expect(screen.getByTestId('habits-streak-run')).toHaveTextContent('Streak: 1 week');
  });
});

describe('HabitsHome measurable habits', () => {
  const water = habit('water', { unit: 'glasses', target: 8 });

  it('shows an amount circle instead of a check', async () => {
    show([water], [{ habitId: 'water', date: '2026-11-02', amount: 3 }]);
    await renderHabits();

    expect(screen.queryByTestId('habits-check-water')).not.toBeOnTheScreen();
    expect(screen.getByTestId('habits-amount-water')).toBeOnTheScreen();
    // The circle shows the progress; no "3 of 8" line repeats it.
    expect(screen.queryByTestId('habits-note-water')).not.toBeOnTheScreen();
  });

  it('opens the amount sheet and saves an amount', async () => {
    show([water], [{ habitId: 'water', date: '2026-11-02', amount: 3 }]);
    await renderHabits();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-amount-water'));
    expect(screen.getByTestId('habits-amount-input').props.value).toBe('3');
    await user.press(screen.getByTestId('habits-amount-plus'));
    await user.press(screen.getByTestId('habits-amount-save'));
    expect(logAmount).toHaveBeenCalledWith(
      { habitId: 'water', date: '2026-11-02', amount: 4 },
      expect.anything(),
    );
    expect(screen.queryByTestId('habits-amount-sheet')).not.toBeOnTheScreen();
  });

  it('clears the amount from the sheet', async () => {
    show([water], [{ habitId: 'water', date: '2026-11-02', amount: 3 }]);
    await renderHabits();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-amount-water'));
    await user.press(screen.getByTestId('habits-amount-clear'));
    expect(logAmount).toHaveBeenCalledWith(
      { habitId: 'water', date: '2026-11-02', amount: null },
      expect.anything(),
    );
  });

  it('counts the day as done only once the target is reached', async () => {
    show([water], [{ habitId: 'water', date: '2026-11-01', amount: 5 }]);
    await renderHabits();
    expect(screen.getByTestId('habits-streak-water')).toHaveTextContent('Streak: 0 days');
  });
});
