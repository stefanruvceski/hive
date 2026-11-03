import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsYear } from './index';
import { useYear } from '../../data/year-queries';

jest.mock('../../data/year-queries');
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-06-15' }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderYear = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsYear />
    </SafeAreaProvider>,
  );

const habits = [
  { id: 'run', name: 'Run' },
  { id: 'read', name: 'Read' },
];
const data = {
  habits,
  completions: [
    { habitId: 'run', date: '2026-06-01' },
    { habitId: 'run', date: '2026-06-02' },
    { habitId: 'read', date: '2026-06-02' },
  ],
};

beforeEach(() => {
  jest.mocked(useYear).mockReturnValue({ data } as never);
});

describe('HabitsYear', () => {
  it('shows the heatmap summary and the insight tiles as full sentences', async () => {
    await renderYear();

    expect(screen.getByTestId('habits-year-label')).toHaveTextContent('2026');
    expect(screen.getByLabelText('Year 2026, 3 completions on 2 active days')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 completions in 2026.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Your longest streak is 2 days, for Run.')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Run is your most completed habit, done 2 times.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('You did at least one habit on 2 days.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Your best day of the week is Tuesday.')).toBeOnTheScreen();
  });

  it('cannot go past the current year, and goes back a year', async () => {
    await renderYear();
    const user = userEvent.setup();

    expect(screen.getByTestId('habits-year-next')).toBeDisabled();
    await user.press(screen.getByTestId('habits-year-prev'));

    expect(screen.getByTestId('habits-year-label')).toHaveTextContent('2025');
    expect(jest.mocked(useYear)).toHaveBeenLastCalledWith(2025);
    expect(screen.getByTestId('habits-year-next')).toBeEnabled();
  });

  it('shows one habit in its own color when picked, and everything again on All', async () => {
    const user = userEvent.setup();
    await renderYear();

    expect(screen.getByTestId('habits-year-filter-all')).toBeChecked();
    await user.press(screen.getByTestId('habits-year-filter-read'));

    expect(screen.getByTestId('habits-year-filter-read')).toBeChecked();
    expect(
      screen.getByLabelText('Year 2026, Read, 1 completion on 1 active day'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('habits-year-most-completed')).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('habits-year-filter-all'));
    expect(screen.getByLabelText('Year 2026, 3 completions on 2 active days')).toBeOnTheScreen();
    expect(screen.getByTestId('habits-year-most-completed')).toBeOnTheScreen();
  });

  it('says so when the picked habit has nothing in the year', async () => {
    jest.mocked(useYear).mockReturnValue({
      data: { habits, completions: [{ habitId: 'run', date: '2026-06-01' }] },
    } as never);
    const user = userEvent.setup();
    await renderYear();

    await user.press(screen.getByTestId('habits-year-filter-read'));
    expect(screen.getByText('Nothing done for Read')).toBeOnTheScreen();
    expect(screen.getByTestId('habits-year-filter-read')).toBeOnTheScreen();
  });

  it('has no filter with a single habit', async () => {
    jest.mocked(useYear).mockReturnValue({
      data: { habits: [habits[0]], completions: [{ habitId: 'run', date: '2026-06-01' }] },
    } as never);
    await renderYear();

    expect(screen.queryByTestId('habits-year-filter')).not.toBeOnTheScreen();
  });

  it('shows an empty state for a year without completions', async () => {
    jest.mocked(useYear).mockReturnValue({ data: { habits, completions: [] } } as never);
    await renderYear();

    expect(screen.getByTestId('habits-year-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('habits-year-heatmap')).not.toBeOnTheScreen();
  });

  it('shows loading, then an error with retry', async () => {
    jest.mocked(useYear).mockReturnValue({ data: undefined, isError: false } as never);
    await renderYear();
    expect(screen.getByTestId('habits-year-loading')).toBeOnTheScreen();
  });

  it('retries when loading failed', async () => {
    const refetch = jest.fn();
    jest
      .mocked(useYear)
      .mockReturnValue({ data: undefined, isError: true, error: new Error('x'), refetch } as never);
    await renderYear();
    const user = userEvent.setup();

    expect(screen.getByTestId('habits-year-error')).toBeOnTheScreen();
    await user.press(screen.getByText('Try again'));
    expect(refetch).toHaveBeenCalled();
  });
});
