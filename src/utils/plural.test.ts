import { countLabel } from './plural';

describe('countLabel', () => {
  it.each([
    [0, '0 apps'],
    [1, '1 app'],
    [2, '2 apps'],
    [12, '12 apps'],
  ])('labels %i as "%s"', (count, label) => {
    expect(countLabel(count, 'app')).toBe(label);
  });
});
