import { fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsHome } from './index';
import {
  type Habit,
  useArchivedHabits,
  useArchiveHabit,
  useCompletions,
  useHabits,
  useMoveHabit,
  useSetCompletion,
} from '../../data/queries';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const move = jest.fn();
const archive = jest.fn();
const habit = (id: string, timeOfDay: Habit['timeOfDay'], position: number) => ({
  id,
  name: id,
  emoji: '📚',
  timeOfDay,
  position,
  createdAt: '2026-11-01',
  archivedAt: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useHabits).mockReturnValue({
    data: [habit('a', 'morning', 0), habit('b', 'evening', 1), habit('c', 'morning', 2)],
  } as never);
  jest.mocked(useCompletions).mockReturnValue({ data: [] } as never);
  jest.mocked(useSetCompletion).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useArchiveHabit).mockReturnValue({ mutate: archive } as never);
  jest.mocked(useMoveHabit).mockReturnValue({ mutate: move } as never);
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

describe('HabitsHome reorder mode', () => {
  it('swaps the checks for move controls, and back on Done', async () => {
    await renderHabits();
    const user = userEvent.setup();
    expect(screen.getByTestId('habits-check-a')).toBeOnTheScreen();
    expect(screen.queryByTestId('habits-up-a')).toBeNull();

    await user.press(screen.getByTestId('habits-reorder-toggle'));
    expect(screen.queryByTestId('habits-check-a')).toBeNull();
    expect(screen.getByTestId('habits-up-a')).toBeOnTheScreen();

    await user.press(screen.getByTestId('habits-reorder-done'));
    expect(screen.getByTestId('habits-check-a')).toBeOnTheScreen();
  });

  it('moves a habit within its part of the day', async () => {
    await renderHabits();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('habits-reorder-toggle'));

    await user.press(screen.getByTestId('habits-down-a'));

    expect(move).toHaveBeenCalledWith({ id: 'a', direction: 'down' }, expect.anything());
  });

  it('disables moves past the ends of a part of the day', async () => {
    await renderHabits();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('habits-reorder-toggle'));
    const morning = within(screen.getByTestId('habits-section-morning'));

    expect(morning.getByTestId('habits-up-a')).toBeDisabled();
    expect(morning.getByTestId('habits-down-c')).toBeDisabled();
    expect(screen.getByTestId('habits-up-b')).toBeDisabled();
    expect(screen.getByTestId('habits-down-b')).toBeDisabled();
  });

  it('has no edit button in reorder mode: editing is a swipe', async () => {
    await renderHabits();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('habits-reorder-toggle'));

    expect(screen.queryByTestId('habits-item-edit-a')).toBeNull();
  });

  it('offers a retry when a move fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    move.mockImplementation((_change, options) => options?.onError?.());
    await renderHabits();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('habits-reorder-toggle'));

    await user.press(screen.getByTestId('habits-down-a'));

    expect(alert).toHaveBeenCalledWith(
      "Couldn't save",
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Try again' })]),
    );
  });

  it('links to archived habits only when there are some', async () => {
    await renderHabits();
    expect(screen.queryByTestId('habits-archived-link')).toBeNull();

    jest.mocked(useArchivedHabits).mockReturnValue({ data: [habit('z', 'anytime', 9)] } as never);
    await renderHabits();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('habits-archived-link'));

    expect(router.push).toHaveBeenCalledWith('/habits/archived');
  });

  // A screen reader cannot swipe: Edit and Archive are custom actions on the habit.
  const act = async (id: string, actionName: string) =>
    await fireEvent(screen.getByTestId(`habits-item-text-${id}`), 'accessibilityAction', {
      nativeEvent: { actionName },
    });

  it('opens the edit form from the Edit action', async () => {
    await renderHabits();
    await act('a', 'edit');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/habits/[id]', params: { id: 'a' } });
  });

  it('archives from the Archive action, and offers a retry when that fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    archive.mockImplementation((_id, options) => options?.onError?.());
    await renderHabits();

    await act('a', 'archive');

    expect(archive).toHaveBeenCalledWith('a', expect.anything());
    expect(alert).toHaveBeenCalledWith(
      "Couldn't archive",
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Try again' })]),
    );
  });

  it('offers no swipe actions while reordering', async () => {
    await renderHabits();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('habits-reorder-toggle'));

    expect(screen.getByTestId('habits-item-text-a').props.accessibilityActions).toEqual([]);
  });
});
