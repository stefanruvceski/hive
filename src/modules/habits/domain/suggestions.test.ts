import { pickSuggestions, starterSuggestions } from './suggestions';

describe('starterSuggestions', () => {
  it('has unique ids and a name for each', () => {
    const ids = starterSuggestions.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(starterSuggestions.every(({ name }) => name.trim().length > 0)).toBe(true);
  });
});

describe('pickSuggestions', () => {
  it('returns the chosen ones as new habits, in suggestion order', () => {
    expect(pickSuggestions(new Set(['read', 'water']))).toEqual([
      { name: 'Drink water', emoji: '💧', timeOfDay: 'anytime' },
      { name: 'Read', emoji: '📚', timeOfDay: 'evening' },
    ]);
  });

  it('returns nothing for no choice or unknown ids', () => {
    expect(pickSuggestions(new Set())).toEqual([]);
    expect(pickSuggestions(new Set(['nope']))).toEqual([]);
  });
});
