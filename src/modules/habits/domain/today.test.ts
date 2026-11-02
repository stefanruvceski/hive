import { countDoneToday, habitsHomeSummary } from './today';
import type { TimeOfDay } from '../data/schema';

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

// Habits as stored: list order is `position`; Today lists them by part of the day (#33 review).
const habit = (id: string, timeOfDay: TimeOfDay, position: number) => ({
  id,
  name: `Habit ${id}`,
  emoji: '🎯',
  timeOfDay,
  position,
});
const evening = habit('read', 'evening', 0);
const morning = habit('water', 'morning', 1);
const anytime = habit('walk', 'anytime', 2);
const afternoon = habit('stretch', 'afternoon', 3);
const item = (h: { id: string; name: string; emoji: string }) => ({
  id: h.id,
  icon: h.emoji,
  name: h.name,
});

describe('habitsHomeSummary', () => {
  it('invites you to add a habit when there are none', () => {
    expect(habitsHomeSummary([], [], today)).toEqual({
      kind: 'message',
      headline: 'No habits yet',
      body: 'Tap to add one',
      label: 'no habits yet',
    });
  });

  it.each([
    [
      'nothing done: every habit, by part of the day',
      [],
      { done: 0, upNext: [morning, afternoon, evening, anytime].map(item) },
    ],
    [
      'done habits leave the list',
      [
        { habitId: 'water', date: today },
        { habitId: 'read', date: today },
      ],
      { done: 2, upNext: [afternoon, anytime].map(item) },
    ],
    [
      "yesterday's completions don't count",
      [{ habitId: 'water', date: '2026-11-01' }],
      { done: 0, upNext: [morning, afternoon, evening, anytime].map(item) },
    ],
    [
      'all done: nothing left',
      [evening, morning, anytime, afternoon].map((h) => ({ habitId: h.id, date: today })),
      { done: 4, upNext: [] },
    ],
  ])('%s', (_name, completions, { done, upNext }) => {
    expect(habitsHomeSummary([evening, morning, anytime, afternoon], completions, today)).toEqual({
      kind: 'progress',
      done,
      total: 4,
      label: `${done} of 4 done today`,
      upNext,
    });
  });
});
