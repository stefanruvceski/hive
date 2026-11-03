import { render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { HabitsReminderSync } from './reminder-sync';
import { useReminderTap } from '../../data/reminder-notifications';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../data/reminder-sync', () => ({ useReminderSync: jest.fn() }));
// A factory: the real module pulls in the native notifications module, which Jest cannot load.
jest.mock('../../data/reminder-notifications', () => ({ useReminderTap: jest.fn() }));

const tapped = (key: string | null) => jest.mocked(useReminderTap).mockReturnValue(key);

beforeEach(() => jest.clearAllMocks());

describe('HabitsReminderSync', () => {
  it('opens Habits when a reminder was tapped, once per tap', async () => {
    tapped('a@1');
    const view = await render(<HabitsReminderSync />);
    await view.rerender(<HabitsReminderSync />);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/habits');

    tapped('b@2');
    await view.rerender(<HabitsReminderSync />);
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('does nothing without a tap', async () => {
    tapped(null);
    await render(<HabitsReminderSync />);

    expect(router.push).not.toHaveBeenCalled();
  });
});
