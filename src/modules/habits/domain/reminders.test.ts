import {
  defaultReminders,
  formatTime,
  isReminderData,
  planReminders,
  reminderData,
  reminderMessage,
  shiftTime,
  type ReminderSetting,
} from './reminders';

describe('reminderMessage', () => {
  it('greets the part of the day and lists what waits', () => {
    expect(reminderMessage('morning', ['Run'])).toEqual({
      title: 'Good morning ☀️',
      body: 'This morning you have Run waiting.',
    });
    expect(reminderMessage('afternoon', ['Run', 'Read']).body).toBe(
      'This afternoon you have Run and Read waiting.',
    );
    expect(reminderMessage('evening', ['Run', 'Read', 'Stretch'])).toEqual({
      title: 'Good evening 🌙',
      body: 'This evening you have Run, Read and Stretch waiting.',
    });
  });

  it('shortens a long list', () => {
    expect(reminderMessage('morning', ['A', 'B', 'C', 'D', 'E', 'F']).body).toBe(
      'This morning you have A, B, C and 3 more waiting.',
    );
  });
});

describe('time of a reminder', () => {
  it('formats as 24-hour HH:MM', () => {
    expect(formatTime(8, 5)).toBe('08:05');
    expect(formatTime(19, 30)).toBe('19:30');
  });

  it('steps in quarters of an hour and stays inside the day', () => {
    expect(shiftTime({ hour: 8, minute: 0 }, 1)).toEqual({ hour: 8, minute: 15 });
    expect(shiftTime({ hour: 8, minute: 45 }, 1)).toEqual({ hour: 9, minute: 0 });
    expect(shiftTime({ hour: 8, minute: 0 }, -1)).toEqual({ hour: 7, minute: 45 });
    expect(shiftTime({ hour: 23, minute: 45 }, 1)).toEqual({ hour: 23, minute: 45 });
    expect(shiftTime({ hour: 0, minute: 0 }, -1)).toEqual({ hour: 0, minute: 0 });
  });
});

describe('defaultReminders', () => {
  it('has the three parts of the day with their times, off until chosen', () => {
    expect(defaultReminders.map((r) => [r.timeOfDay, r.hour, r.enabled])).toEqual([
      ['morning', 8, false],
      ['afternoon', 14, false],
      ['evening', 19, false],
    ]);
  });
});

// Tuesday 3 November 2026, 07:00 local.
const now = new Date(2026, 10, 3, 7, 0);
const on = (timeOfDay: ReminderSetting['timeOfDay']): ReminderSetting[] =>
  defaultReminders.map((r) => ({ ...r, enabled: r.timeOfDay === timeOfDay }));

const habit = (id: string, extra = {}) => ({
  id,
  name: id,
  timeOfDay: 'morning' as const,
  scheduleType: 'daily' as const,
  scheduleDays: null,
  scheduleTimes: null,
  ...extra,
});
const todo = (id: string, extra = {}) => ({
  id,
  title: `Task ${id}`,
  date: '2026-11-03',
  timeOfDay: 'morning' as const,
  done: false,
  ...extra,
});
const plan = (over: Partial<Parameters<typeof planReminders>[0]> = {}) =>
  planReminders({
    settings: on('morning'),
    habits: [habit('run')],
    todos: [],
    doneToday: new Set(),
    today: '2026-11-03',
    now,
    ...over,
  });

describe('planReminders', () => {
  it('plans a reminder for each of the next 7 days at the set time', () => {
    const planned = plan();
    expect(planned).toHaveLength(7);
    expect(planned[0]).toMatchObject({
      id: '2026-11-03-morning',
      at: new Date(2026, 10, 3, 8, 0),
      title: 'Good morning ☀️',
      body: 'This morning you have run waiting.',
    });
    expect(planned[6]?.id).toBe('2026-11-09-morning');
  });

  it('leaves out a time that has already passed today', () => {
    const planned = plan({ now: new Date(2026, 10, 3, 9, 0) });
    expect(planned[0]?.id).toBe('2026-11-04-morning');
    expect(planned).toHaveLength(6);
  });

  it("leaves out today's reminder for what is done, but not the coming days", () => {
    expect(plan({ doneToday: new Set(['run']) }).map((p) => p.id)).not.toContain(
      '2026-11-03-morning',
    );
    expect(plan({ doneToday: new Set(['run']) })).toHaveLength(6);
    expect(plan({ todos: [todo('t', { done: true })], habits: [] })).toHaveLength(0);
  });

  it('lists the habits and to-dos of that part together', () => {
    const planned = plan({ todos: [todo('milk', { title: 'Buy milk' })] });
    expect(planned[0]?.body).toBe('This morning you have run and Buy milk waiting.');
    // The to-do is for today only.
    expect(planned[1]?.body).toBe('This morning you have run waiting.');
  });

  it('only plans a habit on the days it is due', () => {
    // Wednesdays and Fridays.
    const planned = plan({
      habits: [habit('gym', { scheduleType: 'weekdays', scheduleDays: '3,5' })],
    });
    expect(planned.map((p) => p.id)).toEqual(['2026-11-04-morning', '2026-11-06-morning']);
  });

  it('ignores parts that are off, habits of Anytime and other parts', () => {
    expect(plan({ settings: defaultReminders })).toEqual([]);
    expect(plan({ habits: [habit('x', { timeOfDay: 'anytime' })] })).toEqual([]);
    expect(plan({ habits: [habit('x', { timeOfDay: 'evening' })] })).toEqual([]);
  });

  it('plans every enabled part, earliest first', () => {
    const settings = defaultReminders.map((r) => ({ ...r, enabled: true }));
    const planned = plan({
      settings,
      habits: [habit('run'), habit('read', { timeOfDay: 'evening' })],
    });
    expect(planned.slice(0, 2).map((p) => p.id)).toEqual([
      '2026-11-03-morning',
      '2026-11-03-evening',
    ]);
  });
});

describe('isReminderData', () => {
  it('recognises what a Habits reminder carries, and nothing else', () => {
    expect(isReminderData(reminderData)).toBe(true);
    expect(isReminderData({ kind: 'other' })).toBe(false);
    expect(isReminderData(null)).toBe(false);
    expect(isReminderData('habits-reminder')).toBe(false);
  });
});
