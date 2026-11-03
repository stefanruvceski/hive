import { type Backup, backupFileName, backupVersion, buildBackup, parseBackup } from './backup';

const habit: Backup['habits'][number] = {
  id: 'run',
  name: 'Run',
  emoji: '🏃',
  timeOfDay: 'morning',
  position: 1,
  createdAt: '2026-10-01',
  archivedAt: null,
  color: null,
  scheduleType: 'daily',
  scheduleDays: null,
  scheduleTimes: null,
  unit: null,
  target: null,
  aggregation: 'sum',
  quit: false,
};
const tables: Pick<Backup, 'habits' | 'completions' | 'todos' | 'mood' | 'reminders'> = {
  habits: [habit],
  completions: [{ habitId: 'run', date: '2026-11-02', amount: null }],
  todos: [
    {
      id: 'call',
      title: 'Call',
      date: '2026-11-03',
      timeOfDay: 'anytime',
      done: false,
      doneAt: null,
      priority: false,
      position: 2,
      createdAt: '2026-11-03',
    },
  ],
  mood: [
    { date: '2026-11-02', mood: 4, motivation: 3, note: null, updatedAt: '2026-11-02T20:00:00Z' },
  ],
  reminders: [{ timeOfDay: 'morning', enabled: true, hour: 8, minute: 0 }],
};
const file = (over: object = {}) =>
  JSON.stringify({ ...buildBackup(tables, new Date('2026-11-03T10:00:00Z')), ...over });

describe('backup', () => {
  it('round-trips what was exported', () => {
    const result = parseBackup(file());

    expect(result).toEqual({ ok: true, backup: expect.objectContaining(tables) });
  });

  it('refuses text that is not a Hive backup', () => {
    for (const text of ['nope', '[]', '{"app":"other","version":1}', '']) {
      expect(parseBackup(text)).toEqual({ ok: false, reason: 'This file is not a Hive backup.' });
    }
  });

  it('refuses a backup from a newer version', () => {
    const result = parseBackup(file({ version: backupVersion + 1 }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/newer version/);
  });

  it('refuses a damaged table: a missing one, a wrong type, an unknown part of the day', () => {
    const damaged = { ok: false, reason: 'This backup is damaged and was not imported.' };

    expect(parseBackup(file({ todos: undefined }))).toEqual(damaged);
    expect(parseBackup(file({ habits: [{ ...habit, position: '1' }] }))).toEqual(damaged);
    expect(parseBackup(file({ habits: [{ ...habit, timeOfDay: 'night' }] }))).toEqual(damaged);
  });

  it('refuses a completion of a habit that is not in the file', () => {
    const result = parseBackup(
      file({ completions: [{ habitId: 'ghost', date: '2026-11-02', amount: null }] }),
    );

    expect(result.ok).toBe(false);
  });
});

describe('backupFileName', () => {
  it('names the file after the day', () => {
    expect(backupFileName(new Date(2026, 10, 3))).toBe('hive-habits-2026-11-03.json');
  });
});
