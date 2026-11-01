import {
  canSave,
  groupByTimeOfDay,
  habitEmojis,
  newHabitId,
  normalizeName,
  timeOfDayOptions,
} from './habits';

const habit = (
  id: string,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime',
  position: number,
) => ({
  id,
  timeOfDay,
  position,
});

describe('normalizeName', () => {
  it('trims the name', () => {
    expect(normalizeName('  Read 10 pages \n')).toBe('Read 10 pages');
  });

  it('is empty for a name of only spaces', () => {
    expect(normalizeName('   ')).toBe('');
  });
});

describe('canSave', () => {
  it('needs a name that is not empty or only spaces', () => {
    expect(canSave('')).toBe(false);
    expect(canSave('  \t ')).toBe(false);
    expect(canSave(' Run ')).toBe(true);
  });
});

describe('groupByTimeOfDay', () => {
  it('lists parts of the day in day order, each in the order its habits were added', () => {
    const groups = groupByTimeOfDay([
      habit('read', 'evening', 3),
      habit('run', 'morning', 1),
      habit('water', 'anytime', 0),
      habit('stretch', 'morning', 2),
    ]);

    expect(groups.map((group) => [group.timeOfDay, group.habits.map((h) => h.id)])).toEqual([
      ['morning', ['run', 'stretch']],
      ['evening', ['read']],
      ['anytime', ['water']],
    ]);
  });

  it('labels each part of the day', () => {
    expect(groupByTimeOfDay([habit('a', 'afternoon', 0)])[0]?.label).toBe('Afternoon');
  });

  it('is empty without habits', () => {
    expect(groupByTimeOfDay([])).toEqual([]);
  });
});

describe('timeOfDayOptions', () => {
  it('offers the four parts of the day in day order', () => {
    expect(timeOfDayOptions.map((option) => option.label)).toEqual([
      'Morning',
      'Afternoon',
      'Evening',
      'Anytime',
    ]);
  });
});

describe('habitEmojis', () => {
  it('is a fixed grid of 24 distinct emojis that includes the issue example 📚', () => {
    expect(habitEmojis).toHaveLength(24);
    expect(new Set(habitEmojis).size).toBe(24);
    expect(habitEmojis).toContain('📚');
  });
});

describe('newHabitId', () => {
  it('returns a different id every time', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newHabitId()));
    expect(ids.size).toBe(100);
  });
});
