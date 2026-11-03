import { canMove, endPosition, moveWithinPart } from './order';

type H = {
  id: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  position: number;
};
const h = (id: string, timeOfDay: H['timeOfDay'], position: number): H => ({
  id,
  timeOfDay,
  position,
});

// Positions run across parts of the day, so neighbours in one part are not always consecutive.
const habits = [
  h('a', 'morning', 0),
  h('b', 'evening', 1),
  h('c', 'morning', 2),
  h('d', 'morning', 3),
];

describe('moveWithinPart', () => {
  it.each([
    ['c', 'up', { a: 2, c: 0, d: 3, b: 1 }],
    ['a', 'down', { a: 2, c: 0, d: 3, b: 1 }],
    ['c', 'down', { a: 0, c: 3, d: 2, b: 1 }],
    ['d', 'up', { a: 0, c: 3, d: 2, b: 1 }],
  ] as const)(
    'moves %s %s past its neighbour in the same part of the day',
    (id, direction, want) => {
      const moved = moveWithinPart(habits, id, direction);
      expect(Object.fromEntries(moved.map((x) => [x.id, x.position]))).toEqual(want);
    },
  );

  it.each([
    ['a', 'up'],
    ['d', 'down'],
    ['b', 'up'],
    ['b', 'down'],
    ['missing', 'up'],
  ] as const)('leaves the order alone for %s %s', (id, direction) => {
    expect(moveWithinPart(habits, id, direction)).toEqual(habits);
  });

  it('does not change the input', () => {
    const before = JSON.stringify(habits);
    moveWithinPart(habits, 'c', 'up');
    expect(JSON.stringify(habits)).toBe(before);
  });
});

describe('canMove', () => {
  it.each([
    ['a', 'up', false],
    ['a', 'down', true],
    ['c', 'up', true],
    ['d', 'down', false],
    ['b', 'up', false],
    ['b', 'down', false],
  ] as const)('%s %s → %s', (id, direction, want) => {
    expect(canMove(habits, id, direction)).toBe(want);
  });
});

describe('endPosition', () => {
  it('is one past the last position', () => {
    expect(endPosition(habits)).toBe(4);
  });

  it('is 0 for no habits', () => {
    expect(endPosition([])).toBe(0);
  });
});
