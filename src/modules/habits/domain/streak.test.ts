import { currentStreak, doneDatesByHabit, previousDay, setCompletion } from './streak';

const done = (...dates: string[]) => new Set(dates);

describe('currentStreak', () => {
  it.each([
    ['nothing done', done(), 0],
    ['only today', done('2026-11-01'), 1],
    ['the last 3 days including today', done('2026-11-01', '2026-10-31', '2026-10-30'), 3],
    [
      'yesterday and the day before, today not yet (it isn’t over)',
      done('2026-10-31', '2026-10-30'),
      2,
    ],
    ['not yesterday, so the new day starts at 0', done('2026-10-30'), 0],
    ['today after a missed yesterday', done('2026-11-01', '2026-10-29', '2026-10-28'), 1],
    ['a gap ends the run', done('2026-11-01', '2026-10-31', '2026-10-29', '2026-10-28'), 2],
    [
      'days after today (clock moved back) do not count',
      done('2026-11-02', '2026-11-01', '2026-10-31'),
      2,
    ],
  ])('%s → %i', (_case, dates, expected) => {
    expect(currentStreak(dates, '2026-11-01')).toBe(expected);
  });

  it('runs across a year boundary and a leap day', () => {
    expect(currentStreak(done('2027-01-01', '2026-12-31', '2026-12-30'), '2027-01-01')).toBe(3);
    expect(currentStreak(done('2028-03-01', '2028-02-29', '2028-02-28'), '2028-03-01')).toBe(3);
  });

  // Calendar maths, never "minus 24 h": Jest runs in Europe/Belgrade (jest.global-setup.js), where
  // these dates cross the clock changes (2026-03-29 spring forward, 2026-10-25 fall back).
  it('counts calendar days across daylight saving changes', () => {
    expect(currentStreak(done('2026-03-30', '2026-03-29', '2026-03-28'), '2026-03-30')).toBe(3);
    expect(currentStreak(done('2026-10-26', '2026-10-25', '2026-10-24'), '2026-10-26')).toBe(3);
    expect(previousDay('2026-10-26')).toBe('2026-10-25');
    expect(previousDay('2026-03-30')).toBe('2026-03-29');
  });
});

describe('previousDay', () => {
  it('steps back over month and year ends', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });
});

describe('doneDatesByHabit', () => {
  it('groups the done dates by habit', () => {
    const byHabit = doneDatesByHabit([
      { habitId: 'run', date: '2026-11-01' },
      { habitId: 'read', date: '2026-10-31' },
      { habitId: 'run', date: '2026-10-31' },
    ]);

    expect([...(byHabit.get('run') ?? [])]).toEqual(['2026-11-01', '2026-10-31']);
    expect([...(byHabit.get('read') ?? [])]).toEqual(['2026-10-31']);
    expect(byHabit.get('stretch')).toBeUndefined();
  });
});

describe('setCompletion', () => {
  const rows = [
    { habitId: 'run', date: '2026-10-31' },
    { habitId: 'read', date: '2026-11-01' },
  ];

  it('adds a done day once, however often it is marked', () => {
    const once = setCompletion(rows, { habitId: 'run', date: '2026-11-01', done: true });
    const twice = setCompletion(once, { habitId: 'run', date: '2026-11-01', done: true });

    expect(twice).toEqual([...rows, { habitId: 'run', date: '2026-11-01' }]);
  });

  it('removes only that habit’s day when marked not done', () => {
    expect(setCompletion(rows, { habitId: 'read', date: '2026-11-01', done: false })).toEqual([
      { habitId: 'run', date: '2026-10-31' },
    ]);
    expect(setCompletion(rows, { habitId: 'run', date: '2026-11-01', done: false })).toEqual(rows);
  });
});
