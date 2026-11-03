import {
  buildYearGrid,
  daysInYear,
  heatLevel,
  weekColumn,
  weekdayOf,
  yearInsights,
  yearSummary,
  type YearHabit,
} from './year';

const habits: YearHabit[] = [
  { id: 'run', name: 'Run' },
  { id: 'read', name: 'Read' },
];
const done = (habitId: string, ...dates: string[]) => dates.map((date) => ({ habitId, date }));

describe('daysInYear', () => {
  it.each([
    [2024, 366],
    [2025, 365],
    [2100, 365],
    [2000, 366],
  ])('%i has %i days', (year, days) => {
    expect(daysInYear(year)).toBe(days);
  });
});

describe('weekdayOf', () => {
  it.each([
    ['2026-01-01', 3], // Thursday
    ['2026-01-05', 0], // Monday
    ['2026-01-11', 6], // Sunday
    ['2024-02-29', 3],
  ])('%s is weekday %i (Monday = 0)', (date, weekday) => {
    expect(weekdayOf(date)).toBe(weekday);
  });
});

describe('buildYearGrid', () => {
  it.each([
    // year, first day's row, columns, last cell's row
    [2026, 3, 53, 3], // starts Thursday, ends Thursday
    [2024, 0, 53, 1], // leap, starts Monday, ends Tuesday
    [2023, 6, 53, 6], // starts Sunday
    [2025, 2, 53, 2],
  ])('%i: first row %i, %i columns, last row %i', (year, firstRow, columns, lastRow) => {
    const grid = buildYearGrid(year);
    expect(grid.weeks).toHaveLength(columns);
    expect(grid.weeks[0]?.[firstRow]).toBe(`${year}-01-01`);
    expect(grid.weeks[0]?.slice(0, firstRow).every((cell) => cell === null)).toBe(true);
    const last = grid.weeks[columns - 1] ?? [];
    expect(last[lastRow]).toBe(`${year}-12-31`);
    expect(last.slice(lastRow + 1).every((cell) => cell === null)).toBe(true);
  });

  it('has exactly one cell per day, in order', () => {
    const dates = buildYearGrid(2024)
      .weeks.flat()
      .filter((cell) => cell !== null);
    expect(dates).toHaveLength(366);
    expect(dates[59]).toBe('2024-02-29');
    expect([...dates].sort()).toEqual(dates);
  });

  it('uses 53 columns whenever the last week is partial', () => {
    // 2018 starts Monday and has 365 days: 52 full weeks + 1 day.
    expect(buildYearGrid(2018).weeks).toHaveLength(53);
    // 2021 starts Friday: offset 4 + 365 = 369 cells -> 53 columns
    expect(buildYearGrid(2021).weeks).toHaveLength(53);
  });

  it('labels each month at the column of its first day', () => {
    const { months } = buildYearGrid(2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ label: 'Jan', column: 0 });
    expect(months[1]).toEqual({ label: 'Feb', column: 4 }); // Sun 1 Feb is in the week of Mon 26 Jan
    expect(months[11]?.label).toBe('Dec');
  });
});

describe('heatLevel', () => {
  it.each([
    [0, 4, 0],
    [1, 4, 1],
    [2, 4, 2],
    [3, 4, 3],
    [4, 4, 4],
    [1, 8, 1],
    [3, 8, 2],
    [5, 8, 3],
    [7, 8, 4],
    [1, 1, 4],
    [0, 0, 0],
    [3, 2, 4], // more done than habits (a habit deleted since): capped
  ])('%i of %i habits -> step %i', (count, total, level) => {
    expect(heatLevel(count, total)).toBe(level);
  });
});

describe('yearInsights', () => {
  const today = '2026-12-31';

  it('is empty without completions in the year', () => {
    const result = yearInsights({
      year: 2026,
      habits,
      completions: done('run', '2025-12-31', '2027-01-01'),
      today,
    });
    expect(result.total).toBe(0);
    expect(result.activeDays).toBe(0);
    expect(result.bestWeekday).toBeNull();
    expect(result.longestStreak).toBeNull();
    expect(result.mostCompleted).toBeNull();
  });

  it('counts only the year, only known habits', () => {
    const result = yearInsights({
      year: 2026,
      habits,
      completions: [
        ...done('run', '2025-12-31', '2026-01-01', '2026-01-02', '2026-12-31', '2027-01-01'),
        ...done('gone', '2026-03-03'),
        ...done('read', '2026-01-01'),
      ],
      today,
    });
    expect(result.total).toBe(4);
    expect(result.activeDays).toBe(3);
    expect(result.perDay.get('2026-01-01')).toBe(2);
  });

  it('finds the longest streak across year-boundary-adjacent dates and month ends', () => {
    const result = yearInsights({
      year: 2026,
      habits,
      completions: [
        ...done('run', '2026-01-30', '2026-01-31', '2026-02-01', '2026-02-03'),
        ...done('read', '2026-12-30', '2026-12-31', '2027-01-01'),
      ],
      today,
    });
    expect(result.longestStreak).toEqual({ name: 'Run', length: 3 });
  });

  it('keeps leap days in a streak', () => {
    const result = yearInsights({
      year: 2024,
      habits,
      completions: done('run', '2024-02-28', '2024-02-29', '2024-03-01'),
      today: '2024-12-31',
    });
    expect(result.longestStreak).toEqual({ name: 'Run', length: 3 });
  });

  it('breaks ties on streak and count by alphabetical name', () => {
    const result = yearInsights({
      year: 2026,
      habits,
      completions: [
        ...done('run', '2026-02-02', '2026-02-03'),
        ...done('read', '2026-05-04', '2026-05-05'),
      ],
      today,
    });
    expect(result.longestStreak).toEqual({ name: 'Read', length: 2 });
    expect(result.mostCompleted).toEqual({ name: 'Read', count: 2 });
  });

  it('picks the most completed habit', () => {
    const result = yearInsights({
      year: 2026,
      habits,
      completions: [
        ...done('run', '2026-02-02', '2026-02-04', '2026-02-06'),
        ...done('read', '2026-05-05'),
      ],
      today,
    });
    expect(result.mostCompleted).toEqual({ name: 'Run', count: 3 });
  });

  it('picks the weekday with the highest rate, not the highest count', () => {
    // Jan 2026: Mon 5, 12, 19, 26 ... A year has 52 or 53 of each weekday; Thursday has 53 in 2026.
    const result = yearInsights({
      year: 2026,
      habits: [{ id: 'run', name: 'Run' }],
      completions: [
        ...done('run', '2026-01-01', '2026-01-08'), // 2 Thursdays of 53
        ...done('run', '2026-01-05', '2026-01-12'), // 2 Mondays of 52
      ],
      today,
    });
    expect(result.bestWeekday).toBe(0);
  });

  it('breaks weekday ties by the earlier weekday', () => {
    const result = yearInsights({
      year: 2026,
      habits: [{ id: 'run', name: 'Run' }],
      completions: done('run', '2026-01-06', '2026-01-07'), // Tuesday and Wednesday, 52 each
      today,
    });
    expect(result.bestWeekday).toBe(1);
  });

  it('only counts weekdays up to today in the current year', () => {
    // Up to Wed 7 Jan every weekday has occurred once, so Thursday and Friday tie (earlier wins).
    // Over the whole year Thursday has 53 days and Friday 52, which would make Friday win.
    const result = yearInsights({
      year: 2026,
      habits: [{ id: 'run', name: 'Run' }],
      completions: done('run', '2026-01-01', '2026-01-02'),
      today: '2026-01-07',
    });
    expect(result.bestWeekday).toBe(3);
  });
});

describe('yearSummary', () => {
  it.each([
    [2026, 143, 97, 'Year 2026, 143 completions on 97 active days'],
    [2026, 1, 1, 'Year 2026, 1 completion on 1 active day'],
    [2025, 0, 0, 'Year 2025, 0 completions on 0 active days'],
  ])('%i with %i completions', (year, total, active, text) => {
    expect(yearSummary(year, total, active)).toBe(text);
  });
});

describe('weekColumn', () => {
  it.each([
    [2026, '2026-01-01', 0],
    [2026, '2026-02-01', 4],
    [2026, '2026-11-03', 44],
    [2026, '2026-12-31', 52],
    [2026, '2025-12-31', null],
    [2026, '2027-01-01', null],
  ])('%i %s is in column %s', (year, date, column) => {
    expect(weekColumn(year, date)).toBe(column);
  });
});
