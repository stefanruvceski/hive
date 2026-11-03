import { currentPart, partState } from './day-part';

describe('currentPart', () => {
  it.each([
    [0, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [23, 'evening'],
  ] as const)('hour %i is %s', (hour, part) => {
    expect(currentPart(hour)).toBe(part);
  });
});

describe('partState', () => {
  it('marks the current part "now", earlier parts "earlier" and later ones "later"', () => {
    expect(partState('morning', 15)).toBe('earlier');
    expect(partState('afternoon', 15)).toBe('now');
    expect(partState('evening', 15)).toBe('later');
  });

  it('never marks "anytime"', () => {
    expect(partState('anytime', 15)).toBe('later');
    expect(partState('anytime', 3)).toBe('later');
  });
});
