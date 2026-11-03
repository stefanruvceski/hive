import { renderHook } from '@testing-library/react-native';

import { useCompletions, useHabits } from './queries';
import { hasReminderPermission, scheduleReminders } from './reminder-notifications';
import { useReminderSettings } from './reminder-queries';
import { useReminderSync } from './reminder-sync';
import { useTodos } from './todo-queries';
import { defaultReminders } from '../domain/reminders';

jest.mock('./queries');
jest.mock('./todo-queries');
jest.mock('./reminder-queries');
// A factory: the real module pulls in the native notifications module, which Jest cannot load.
jest.mock('./reminder-notifications', () => ({
  hasReminderPermission: jest.fn(),
  scheduleReminders: jest.fn(),
}));
// Tuesday 3 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-03' }));

const habit = {
  id: 'run',
  name: 'Run',
  timeOfDay: 'evening',
  scheduleType: 'daily',
  scheduleDays: null,
  scheduleTimes: null,
};
const settings = (enabled: boolean) => defaultReminders.map((r) => ({ ...r, enabled }));

const load = (over: { enabled?: boolean; completions?: object[] } = {}) => {
  jest.mocked(useHabits).mockReturnValue({ data: [habit] } as never);
  jest.mocked(useCompletions).mockReturnValue({ data: over.completions ?? [] } as never);
  jest.mocked(useTodos).mockReturnValue({ data: [] } as never);
  jest
    .mocked(useReminderSettings)
    .mockReturnValue({ data: settings(over.enabled ?? true) } as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date(2026, 10, 3, 7, 0) });
  jest.mocked(hasReminderPermission).mockResolvedValue(true);
  jest.mocked(scheduleReminders).mockResolvedValue();
});
afterEach(() => jest.useRealTimers());

const settle = () => jest.advanceTimersByTimeAsync(0);

describe('useReminderSync', () => {
  it('schedules the planned reminders once everything is loaded', async () => {
    load();
    await renderHook(() => useReminderSync());
    await settle();

    const planned = jest.mocked(scheduleReminders).mock.calls[0]?.[0] ?? [];
    expect(planned).toHaveLength(7);
    expect(planned[0]).toMatchObject({
      id: '2026-11-03-evening',
      body: expect.stringContaining('Run'),
    });
  });

  it("leaves today's reminder out for a habit already done today", async () => {
    load({ completions: [{ habitId: 'run', date: '2026-11-03' }] });
    await renderHook(() => useReminderSync());
    await settle();

    const planned = jest.mocked(scheduleReminders).mock.calls[0]?.[0] ?? [];
    expect(planned.map((p) => p.id)).not.toContain('2026-11-03-evening');
  });

  it('clears the schedule when every reminder is off, without asking for permission', async () => {
    load({ enabled: false });
    jest.mocked(hasReminderPermission).mockResolvedValue(false);
    await renderHook(() => useReminderSync());
    await settle();

    expect(scheduleReminders).toHaveBeenCalledWith([]);
  });

  it('schedules nothing without permission', async () => {
    load();
    jest.mocked(hasReminderPermission).mockResolvedValue(false);
    await renderHook(() => useReminderSync());
    await settle();

    expect(scheduleReminders).not.toHaveBeenCalled();
  });

  it('waits until the data has loaded', async () => {
    load();
    jest.mocked(useHabits).mockReturnValue({ data: undefined } as never);
    await renderHook(() => useReminderSync());
    await settle();

    expect(scheduleReminders).not.toHaveBeenCalled();
  });
});
