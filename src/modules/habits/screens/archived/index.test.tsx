import { render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsArchived } from './index';
import { useArchivedHabits, useDeleteHabit, useRestoreHabit } from '../../data/queries';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const restore = jest.fn();
const remove = jest.fn();
const run = { id: 'run', name: 'Run', emoji: '🏃', timeOfDay: 'morning', position: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useArchivedHabits).mockReturnValue({ data: [run] } as never);
  jest.mocked(useRestoreHabit).mockReturnValue({ mutate: restore } as never);
  jest.mocked(useDeleteHabit).mockReturnValue({ mutate: remove } as never);
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderArchived = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsArchived />
    </SafeAreaProvider>,
  );

describe('HabitsArchived', () => {
  it('lists archived habits and restores one', async () => {
    await renderArchived();
    const user = userEvent.setup();

    expect(screen.getByText('Run')).toBeOnTheScreen();
    await user.press(
      screen.getByTestId('habits-archived-swipe-run-edit', { includeHiddenElements: true }),
    );

    expect(restore).toHaveBeenCalledWith('run', expect.anything());
  });

  it('warns that history is deleted too and deletes only after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderArchived();
    const user = userEvent.setup();

    await user.press(
      screen.getByTestId('habits-archived-swipe-run-archive', { includeHiddenElements: true }),
    );
    expect(remove).not.toHaveBeenCalled();
    expect(alert.mock.calls[0]?.[1]).toMatch(/history/i);
    alert.mock.calls[0]?.[2]?.find((b) => b.text === 'Delete')?.onPress?.();

    expect(remove).toHaveBeenCalledWith('run', expect.anything());
  });

  it('offers a retry when restoring fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    restore.mockImplementation((_id, options) => options?.onError?.());
    await renderArchived();
    const user = userEvent.setup();

    await user.press(
      screen.getByTestId('habits-archived-swipe-run-edit', { includeHiddenElements: true }),
    );

    expect(alert).toHaveBeenCalledWith(
      "Couldn't restore",
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Try again' })]),
    );
  });

  it('shows an empty state when nothing is archived', async () => {
    jest.mocked(useArchivedHabits).mockReturnValue({ data: [] } as never);
    await renderArchived();
    expect(screen.getByTestId('habits-archived-empty')).toBeOnTheScreen();
  });
});
