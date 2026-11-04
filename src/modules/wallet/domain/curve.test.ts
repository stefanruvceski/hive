import { curvePath } from './curve';

describe('curvePath', () => {
  it('has no line for fewer than two points', () => {
    expect(curvePath([])).toBe('');
    expect(curvePath([{ x: 0, y: 5 }])).toBe('');
  });

  it('goes through every point', () => {
    const path = curvePath([
      { x: 0, y: 10 },
      { x: 50, y: 0 },
      { x: 100, y: 20 },
    ]);
    expect(path.startsWith('M0,10 C')).toBe(true);
    expect(path).toContain(' 50,0 C');
    expect(path.endsWith(' 100,20')).toBe(true);
  });

  it('never overshoots a peak or a dip', () => {
    const points = [
      { x: 0, y: 10 },
      { x: 40, y: 0 },
      { x: 80, y: 30 },
      { x: 120, y: 30 },
      { x: 160, y: 5 },
    ];
    const numbers = curvePath(points)
      .match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g)!
      .map((pair) => Number(pair.split(',')[1]));
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(30);
  });

  it('keeps a flat stretch flat', () => {
    const path = curvePath([
      { x: 0, y: 7 },
      { x: 60, y: 7 },
    ]);
    expect(path).toBe('M0,7 C20,7 40,7 60,7');
  });
});
