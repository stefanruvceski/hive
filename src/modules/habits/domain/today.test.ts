import { countDoneToday, habitsHomeSummary } from './today';

const today = '2026-11-02';
const habits = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('countDoneToday', () => {
  it.each([
    ['no habits', [], [], { done: 0, total: 0 }],
    ['nothing done', habits, [], { done: 0, total: 3 }],
    ['one done today', habits, [{ habitId: 'b', date: today }], { done: 1, total: 3 }],
    [
      'other days do not count',
      habits,
      [
        { habitId: 'a', date: '2026-11-01' },
        { habitId: 'b', date: '2026-11-03' },
      ],
      { done: 0, total: 3 },
    ],
    [
      'a deleted habit does not count',
      habits,
      [
        { habitId: 'gone', date: today },
        { habitId: 'a', date: today },
      ],
      { done: 1, total: 3 },
    ],
    [
      'all done',
      habits,
      habits.map((habit) => ({ habitId: habit.id, date: today })),
      { done: 3, total: 3 },
    ],
  ])('%s', (_name, list, completions, expected) => {
    expect(countDoneToday(list, completions, today)).toEqual(expected);
  });
});

describe('habitsHomeSummary', () => {
  it.each([
    [
      { done: 0, total: 0 },
      {
        kind: 'message',
        headline: 'No habits yet',
        body: 'Tap to add one',
        label: 'no habits yet',
      },
    ],
    [
      { done: 1, total: 2 },
      { kind: 'progress', done: 1, total: 2, label: '1 of 2 done today' },
    ],
    [
      { done: 0, total: 1 },
      { kind: 'progress', done: 0, total: 1, label: '0 of 1 done today' },
    ],
  ])('%o', (count, expected) => {
    expect(habitsHomeSummary(count)).toEqual(expected);
  });
});
