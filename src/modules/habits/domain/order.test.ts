import { endPosition } from './order';

const habits = [{ position: 0 }, { position: 1 }, { position: 2 }, { position: 3 }];

describe('endPosition', () => {
  it('is one past the last position', () => {
    expect(endPosition(habits)).toBe(4);
  });

  it('is 0 for no habits', () => {
    expect(endPosition([])).toBe(0);
  });
});
