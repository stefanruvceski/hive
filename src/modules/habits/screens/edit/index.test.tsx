import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsEdit } from './index';
import { useArchiveHabit, useHabits, useUpdateHabit } from '../../data/queries';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));

const update = jest.fn();
const archive = jest.fn();
const run = { id: 'run', name: 'Run', emoji: '🏃', timeOfDay: 'morning', position: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useHabits).mockReturnValue({ data: [run] } as never);
  jest
    .mocked(useUpdateHabit)
    .mockReturnValue({ mutate: update, isPending: false, isError: false } as never);
  jest.mocked(useArchiveHabit).mockReturnValue({ mutate: archive } as never);
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderEdit = (id = 'run') =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsEdit id={id} />
    </SafeAreaProvider>,
  );

describe('HabitsEdit', () => {
  it('opens with the habit and saves the changes', async () => {
    update.mockImplementation((_input, options) => options?.onSuccess?.());
    await renderEdit();
    const user = userEvent.setup();

    expect(screen.getByTestId('habits-edit-name').props.value).toBe('Run');
    await user.clear(screen.getByTestId('habits-edit-name'));
    await user.type(screen.getByTestId('habits-edit-name'), 'Jog');
    await user.press(screen.getByRole('radio', { name: 'Evening' }));
    await user.press(screen.getByTestId('habits-edit-save'));

    expect(update).toHaveBeenCalledWith(
      { id: 'run', name: 'Jog', emoji: '🏃', timeOfDay: 'evening' },
      expect.anything(),
    );
    expect(router.dismissTo).toHaveBeenCalledWith('/habits');
  });

  it("opens on the habit's color and saves a new one", async () => {
    jest.mocked(useHabits).mockReturnValue({ data: [{ ...run, color: 'sky' }] } as never);
    await renderEdit();
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: 'Sky' })).toBeChecked();
    await user.press(screen.getByRole('radio', { name: 'Rose' }));
    await user.press(screen.getByTestId('habits-edit-save'));
    expect(update).toHaveBeenCalledWith(
      { id: 'run', name: 'Run', emoji: '🏃', timeOfDay: 'morning', color: 'rose' },
      expect.anything(),
    );
  });

  it('saves Automatic by leaving the color out', async () => {
    jest.mocked(useHabits).mockReturnValue({ data: [{ ...run, color: 'sky' }] } as never);
    await renderEdit();
    const user = userEvent.setup();

    await user.press(screen.getByRole('radio', { name: 'Automatic color' }));
    await user.press(screen.getByTestId('habits-edit-save'));
    expect(update).toHaveBeenCalledWith(
      { id: 'run', name: 'Run', emoji: '🏃', timeOfDay: 'morning' },
      expect.anything(),
    );
  });

  it("opens on the habit's schedule and goal and keeps them when saving", async () => {
    jest.mocked(useHabits).mockReturnValue({
      data: [
        {
          ...run,
          scheduleType: 'weekly',
          scheduleTimes: 2,
          unit: 'km',
          target: 5,
          aggregation: 'max',
        },
      ],
    } as never);
    await renderEdit();
    const user = userEvent.setup();

    expect(screen.getByTestId('habits-edit-schedule-times')).toHaveTextContent('2 times a week');
    expect(screen.getByRole('switch', { name: 'Measure an amount' })).toBeChecked();
    expect(screen.getByTestId('habits-edit-goal-unit').props.value).toBe('km');
    expect(screen.getByTestId('habits-edit-goal-target').props.value).toBe('5');
    await user.press(screen.getByTestId('habits-edit-save'));
    expect(update).toHaveBeenCalledWith(
      {
        id: 'run',
        name: 'Run',
        emoji: '🏃',
        timeOfDay: 'morning',
        schedule: { type: 'weekly', days: [], times: 2 },
        goal: { unit: 'km', target: 5, aggregation: 'max' },
      },
      expect.anything(),
    );
  });

  it('opens a quit habit with its switch on and keeps it when saving', async () => {
    jest.mocked(useHabits).mockReturnValue({ data: [{ ...run, quit: true }] } as never);
    await renderEdit();

    expect(screen.getByRole('switch', { name: 'Quit habit' })).toBeChecked();
    await userEvent.setup().press(screen.getByTestId('habits-edit-save'));
    expect(update).toHaveBeenCalledWith(
      { id: 'run', name: 'Run', emoji: '🏃', timeOfDay: 'morning', quit: true },
      expect.anything(),
    );
  });

  it('archives only after the user confirms', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderEdit();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-edit-archive'));
    expect(archive).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]?.[2];
    buttons?.find((b) => b.text === 'Archive')?.onPress?.();

    expect(archive).toHaveBeenCalledWith('run', expect.anything());
  });

  it('offers a retry when archiving fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    archive.mockImplementation((_id, options) => options?.onError?.());
    await renderEdit();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-edit-archive'));
    alert.mock.calls[0]?.[2]?.find((b) => b.text === 'Archive')?.onPress?.();

    expect(alert).toHaveBeenLastCalledWith(
      "Couldn't archive",
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Try again' })]),
    );
  });

  it('says so when the habit does not exist', async () => {
    await renderEdit('gone');
    expect(screen.getByTestId('habits-edit-missing')).toBeOnTheScreen();
  });

  it('shows the loading state while the habits load', async () => {
    jest.mocked(useHabits).mockReturnValue({ data: undefined, isError: false } as never);
    await renderEdit();
    expect(screen.getByTestId('habits-edit-loading')).toBeOnTheScreen();
  });
});
