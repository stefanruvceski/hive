import { dateLine, greeting } from './greeting';

describe('greeting', () => {
  it.each([
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [17, 'Good afternoon'],
    [18, 'Good evening'],
    [23, 'Good evening'],
    [0, 'Good evening'],
    [4, 'Good evening'],
  ])('at %i:00 says %s', (hour, expected) => {
    expect(greeting(new Date(2026, 9, 31, hour, 30))).toBe(expected);
  });
});

describe('dateLine', () => {
  it('writes the weekday, month and day', () => {
    expect(dateLine(new Date(2026, 9, 31, 15))).toBe('Saturday, October 31');
  });
});
