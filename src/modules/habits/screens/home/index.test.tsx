import { render, screen, userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';

import { HabitsHome } from './index';
import { type Habit, useHabits } from '../../data/queries';

// The database boundary: the module's query hooks (09 §5). Domain logic is tested without mocks.
jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const mockedHabits = jest.mocked(useHabits);
const result = (value: object) => value as ReturnType<typeof useHabits>;

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

  // Home is under every deep link (`unstable_settings.anchor` in src/app/_layout.tsx).
  it('goes back to Home', async () => {
    mockedHabits.mockReturnValue(result({ data: [] }));
    await renderHabits();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Back' }));
    expect(router.back).toHaveBeenCalled();
  });
});
