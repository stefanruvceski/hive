import {
  canSaveMood,
  type MoodEntry,
  moodFaces,
  noteLimit,
  normalizeNote,
  recentEntries,
  upsertEntry,
} from './mood';

const entry = (date: string, mood = 3, motivation = 3): MoodEntry => ({
  date,
  mood,
  motivation,
  note: null,
  updatedAt: `${date}T08:00:00.000Z`,
});

describe('canSaveMood', () => {
  it.each([
    [{ mood: 3, motivation: 4 }, true],
    [{ mood: 1, motivation: 5 }, true],
    [{ mood: null, motivation: 4 }, false],
    [{ mood: 3, motivation: null }, false],
    [{ mood: null, motivation: null }, false],
    [{ mood: 0, motivation: 3 }, false],
    [{ mood: 3, motivation: 6 }, false],
    [{ mood: 2.5, motivation: 3 }, false],
  ])('%j → %s', (input, expected) => {
    expect(canSaveMood(input)).toBe(expected);
  });
});

describe('normalizeNote', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['  slept well ', 'slept well'],
    ['x'.repeat(noteLimit + 20), 'x'.repeat(noteLimit)],
  ])('%j → %j', (input, expected) => {
    expect(normalizeNote(input)).toBe(expected);
  });
});

describe('moodFaces', () => {
  it('has five faces, 1 to 5, each with an emoji and a label', () => {
    expect(moodFaces.map((face) => face.value)).toEqual([1, 2, 3, 4, 5]);
    for (const face of moodFaces) {
      expect(face.emoji).not.toBe('');
      expect(face.label).not.toBe('');
    }
  });
});

describe('recentEntries', () => {
  const today = '2026-11-02';
  it('keeps the last 30 days before today, newest first', () => {
    const entries = [
      entry('2026-10-03'), // 30 days back: kept
      entry('2026-10-02'), // 31 days back: dropped
      entry('2026-11-02'), // today: dropped
      entry('2026-11-01'),
      entry('2026-11-03'), // future (clock change): dropped
    ];
    expect(recentEntries(entries, today).map((e) => e.date)).toEqual(['2026-11-01', '2026-10-03']);
  });

  it('is empty without entries', () => {
    expect(recentEntries([], today)).toEqual([]);
  });
});

describe('upsertEntry', () => {
  it('replaces the entry of the same day', () => {
    const next = entry('2026-11-02', 5, 5);
    expect(upsertEntry([entry('2026-11-02'), entry('2026-11-01')], next)).toEqual([
      entry('2026-11-01'),
      next,
    ]);
  });

  it('adds a new day', () => {
    expect(upsertEntry([], entry('2026-11-02'))).toEqual([entry('2026-11-02')]);
  });
});
