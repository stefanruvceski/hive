import {
  allHabitEmojis,
  canSave,
  firstGrapheme,
  groupByTimeOfDay,
  habitColorIndex,
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

describe('allHabitEmojis', () => {
  it('keeps the first 24 in place and adds many more, all distinct', () => {
    expect(allHabitEmojis.slice(0, habitEmojis.length)).toEqual(habitEmojis);
    expect(allHabitEmojis.length).toBeGreaterThanOrEqual(60);
    expect(new Set(allHabitEmojis).size).toBe(allHabitEmojis.length);
  });
});

describe('firstGrapheme', () => {
  it.each([
    ['🚀', '🚀'],
    ['🚀🔥', '🚀'],
    ['👨‍👩‍👧 family', '👨‍👩‍👧'],
    ['🇷🇸x', '🇷🇸'],
    ['❤️', '❤️'],
    ['a', 'a'],
    ['  😀', '😀'],
    ['', ''],
    ['   ', ''],
  ])('%j -> %j', (text, expected) => {
    expect(firstGrapheme(text)).toBe(expected);
  });
});

describe('newHabitId', () => {
  it('returns a different id every time', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newHabitId()));
    expect(ids.size).toBe(100);
  });
});

describe('habitColorIndex', () => {
  it('is stable for an id and always inside the palette', () => {
    for (const id of ['a', 'read', 'b1c2d3', '8f14e45f-ceea-467a-9575-2c5d4fd1b1c6', '']) {
      const index = habitColorIndex(id, 8);
      expect(index).toBe(habitColorIndex(id, 8));
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(8);
    }
  });

  it('spreads different ids over the palette', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `habit-${i}`);
    const used = new Set(ids.map((id) => habitColorIndex(id, 8)));
    expect(used.size).toBe(8);
  });
});
