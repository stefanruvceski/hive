import { render, screen, userEvent } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsReminders } from './index';
import { requestReminderPermission } from '../../data/reminder-notifications';
import { useReminderSettings, useSaveReminder } from '../../data/reminder-queries';
import { defaultReminders, type ReminderSetting } from '../../domain/reminders';

jest.mock('../../data/reminder-queries');
// A factory: the real module pulls in the native notifications module, which Jest cannot load.
jest.mock('../../data/reminder-notifications', () => ({
  requestReminderPermission: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const save = jest.fn();
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const show = (settings: readonly ReminderSetting[] = defaultReminders) =>
  jest.mocked(useReminderSettings).mockReturnValue({ data: settings } as never);
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsReminders />
    </SafeAreaProvider>,
  );
const withMorning = (extra: Partial<ReminderSetting>) =>
  defaultReminders.map((r) => (r.timeOfDay === 'morning' ? { ...r, ...extra } : r));

beforeEach(() => {
  jest.clearAllMocks();
  show();
  jest.mocked(useSaveReminder).mockReturnValue({ mutate: save } as never);
  jest.mocked(requestReminderPermission).mockResolvedValue(true);
});

describe('HabitsReminders', () => {
  it('lists the three parts of the day, off, without a time until one is on', async () => {
    await renderScreen();

    for (const part of ['morning', 'afternoon', 'evening']) {
      expect(screen.getByTestId(`habits-reminder-${part}-switch`)).not.toBeChecked();
      expect(screen.queryByTestId(`habits-reminder-${part}-time`)).toBeNull();
    }
    expect(screen.queryByTestId('habits-reminder-anytime-switch')).toBeNull();
  });

  it('asks for permission, then turns a reminder on at its default time', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-reminder-morning-switch'));

    expect(requestReminderPermission).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(
      { timeOfDay: 'morning', enabled: true, hour: 8, minute: 0 },
      expect.anything(),
    );
  });

  it('stays off and explains when the permission is declined', async () => {
    jest.mocked(requestReminderPermission).mockResolvedValue(false);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-reminder-morning-switch'));

    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId('habits-reminders-denied')).toBeOnTheScreen();
    await user.press(screen.getByTestId('habits-reminders-open-settings'));
    expect(open).toHaveBeenCalled();
  });

  it('turns a reminder off without asking again', async () => {
    show(withMorning({ enabled: true }));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-reminder-morning-switch'));

    expect(requestReminderPermission).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(
      { timeOfDay: 'morning', enabled: false, hour: 8, minute: 0 },
      expect.anything(),
    );
  });

  it('shows the time of a reminder that is on and moves it by 15 minutes', async () => {
    show(withMorning({ enabled: true }));
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByTestId('habits-reminder-morning-time')).toHaveTextContent('08:00');
    await user.press(screen.getByTestId('habits-reminder-morning-later'));
    expect(save).toHaveBeenLastCalledWith(
      { timeOfDay: 'morning', enabled: true, hour: 8, minute: 15 },
      expect.anything(),
    );
    await user.press(screen.getByTestId('habits-reminder-morning-earlier'));
    expect(save).toHaveBeenLastCalledWith(
      { timeOfDay: 'morning', enabled: true, hour: 7, minute: 45 },
      expect.anything(),
    );
  });

  it('offers a retry when a change cannot be saved', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    save.mockImplementation((_setting, options) => options.onError());
    show(withMorning({ enabled: true }));
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-reminder-morning-later'));

    expect(alert).toHaveBeenCalledWith("Couldn't save", expect.any(String), expect.any(Array));
  });
});
