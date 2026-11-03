import {
  formatDays,
  isoWeekday,
  isScheduled,
  isValidSchedule,
  longestStreakOf,
  parseDays,
  scheduleOf,
  streakOf,
  weekStart,
  weeklyProgress,
} from './schedule';

const done = (...dates: string[]) => new Set(dates);

describe('parseDays / formatDays', () => {
  it.each([
    ['1,3,5', [1, 3, 5]],
    ['7,1,1,9,x,0', [1, 7]],
    ['', []],
    [null, []],
  ])('parses %j', (text, days) => {
    expect(parseDays(text)).toEqual(days);
  });

  it('writes sorted, distinct weekdays', () => {
    expect(formatDays([5, 1, 3, 1])).toBe('1,3,5');
    expect(formatDays([])).toBe('');
  });
});

describe('isoWeekday', () => {
  it.each([
    ['2026-11-02', 1],
    ['2026-11-08', 7],
    ['2026-01-01', 4],
    ['2024-02-29', 4],
  ])('%s is %i (Monday = 1)', (date, weekday) => {
    expect(isoWeekday(date)).toBe(weekday);
  });
});

describe('weekStart', () => {
  it.each([
    ['2026-11-02', '2026-11-02'],
    ['2026-11-03', '2026-11-02'],
    ['2026-11-08', '2026-11-02'],
    ['2027-01-01', '2026-12-28'],
    ['2024-03-03', '2024-02-26'],
  ])('%s is in the week of %s', (date, monday) => {
    expect(weekStart(date)).toBe(monday);
  });
});

describe('scheduleOf', () => {
  it('reads the columns, defaulting to daily', () => {
    expect(scheduleOf({})).toEqual({ type: 'daily', days: [], times: 1 });
    expect(
      scheduleOf({ scheduleType: 'weekdays', scheduleDays: '1,3', scheduleTimes: null }),
    ).toEqual({ type: 'weekdays', days: [1, 3], times: 1 });
    expect(scheduleOf({ scheduleType: 'weekly', scheduleTimes: 3 })).toEqual({
      type: 'weekly',
      days: [],
      times: 3,
    });
  });
});

describe('isScheduled', () => {
  const mwf = { type: 'weekdays', days: [1, 3, 5], times: 1 } as const;
  it.each([
    [{ type: 'daily', days: [], times: 1 } as const, '2026-11-03', true],
    [mwf, '2026-11-02', true],
    [mwf, '2026-11-03', false],
    [mwf, '2026-11-06', true],
    [{ type: 'weekly', days: [], times: 3 } as const, '2026-11-03', true],
  ])('%j on %s -> %s', (schedule, date, expected) => {
    expect(isScheduled(schedule, date)).toBe(expected);
  });
});

describe('weeklyProgress', () => {
  it('counts the done days of the week the date is in', () => {
    const dates = done('2026-10-30', '2026-11-02', '2026-11-04', '2026-11-08', '2026-11-09');
    expect(weeklyProgress({ type: 'weekly', days: [], times: 3 }, dates, '2026-11-05')).toEqual({
      done: 3,
      times: 3,
    });
  });
});

describe('streakOf', () => {
  const daily = { type: 'daily', days: [], times: 1 } as const;
  const mwf = { type: 'weekdays', days: [1, 3, 5], times: 1 } as const;
  const weekly3 = { type: 'weekly', days: [], times: 3 } as const;

  it.each([
    ['done through today', daily, ['2026-11-01', '2026-11-02', '2026-11-03'], '2026-11-03', 3],
    ['an open today does not break it', daily, ['2026-11-01', '2026-11-02'], '2026-11-03', 2],
    ['a missed day breaks it', daily, ['2026-11-01', '2026-11-03'], '2026-11-03', 1],
    ['nothing done', daily, [], '2026-11-03', 0],
    ['days off do not break it', mwf, ['2026-11-02', '2026-11-04'], '2026-11-05', 2],
    ['a missed scheduled day breaks it', mwf, ['2026-11-02'], '2026-11-05', 0],
    [
      'an open scheduled today does not break it',
      mwf,
      ['2026-11-02', '2026-11-04'],
      '2026-11-06',
      2,
    ],
    [
      'a done day off still counts',
      mwf,
      ['2026-11-02', '2026-11-03', '2026-11-04'],
      '2026-11-04',
      3,
    ],
    ['across a month end', daily, ['2026-10-30', '2026-10-31', '2026-11-01'], '2026-11-01', 3],
  ])('days: %s', (_name, schedule, dates, today, expected) => {
    expect(streakOf(schedule, done(...dates), today)).toEqual({ value: expected, unit: 'day' });
  });

  it.each([
    [
      'the open current week does not break it',
      [
        '2026-10-19',
        '2026-10-20',
        '2026-10-21',
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-11-02',
      ],
      '2026-11-04',
      2,
    ],
    [
      'the current week counts once its target is met',
      [
        '2026-10-19',
        '2026-10-20',
        '2026-10-21',
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
      ],
      '2026-11-04',
      3,
    ],
    [
      'a week under its target breaks it',
      ['2026-10-19', '2026-10-20', '2026-10-26', '2026-10-27', '2026-10-28'],
      '2026-11-04',
      1,
    ],
    ['nothing done', [], '2026-11-04', 0],
  ])('weeks: %s', (_name, dates, today, expected) => {
    expect(streakOf(weekly3, done(...dates), today)).toEqual({ value: expected, unit: 'week' });
  });
});

describe('isValidSchedule', () => {
  it.each([
    [{ type: 'daily', days: [], times: 1 } as const, true],
    [{ type: 'weekdays', days: [2], times: 1 } as const, true],
    [{ type: 'weekdays', days: [], times: 1 } as const, false],
    [{ type: 'weekly', days: [], times: 3 } as const, true],
    [{ type: 'weekly', days: [], times: 0 } as const, false],
    [{ type: 'weekly', days: [], times: 8 } as const, false],
  ])('%j -> %s', (schedule, expected) => {
    expect(isValidSchedule(schedule)).toBe(expected);
  });
});

describe('longestStreakOf', () => {
  const daily = { type: 'daily', days: [], times: 1 } as const;
  const mwf = { type: 'weekdays', days: [1, 3, 5], times: 1 } as const;
  const weekly3 = { type: 'weekly', days: [], times: 3 } as const;

  it.each([
    [
      'daily runs',
      daily,
      ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'],
      3,
    ],
    ['days off do not break it', mwf, ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'], 4],
    ['a missed scheduled day does', mwf, ['2026-11-02', '2026-11-06'], 1],
    ['nothing done', daily, [], 0],
  ])('days: %s', (_name, schedule, dates, expected) => {
    expect(longestStreakOf(schedule, done(...dates))).toEqual({ value: expected, unit: 'day' });
  });

  it('counts weeks in a row at the target for a weekly habit', () => {
    const dates = [
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-26',
      '2026-10-27',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ];
    expect(longestStreakOf(weekly3, done(...dates))).toEqual({ value: 2, unit: 'week' });
  });
});
