import { daysBetween, oldestUsageDate, rankByUsage, usageScores } from './app-usage';

const row = (moduleId: string, date: string, opens: number) => ({ moduleId, date, opens });
const app = (id: string) => ({ id });

describe('daysBetween', () => {
  it('counts calendar days, across months and daylight saving changes', () => {
    expect(daysBetween('2026-11-01', '2026-11-01')).toBe(0);
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
});

describe('oldestUsageDate', () => {
  it('is the first day of the 30-day window that ends today', () => {
    expect(oldestUsageDate('2026-11-01')).toBe('2026-10-03');
    expect(daysBetween(oldestUsageDate('2026-03-30'), '2026-03-30')).toBe(29);
  });
});

describe('usageScores', () => {
  it('weighs recent opens more and ignores opens outside the last 30 days', () => {
    const scores = usageScores(
      [
        row('books', '2026-11-01', 2),
        row('music', '2026-10-25', 2),
        row('music', '2026-10-02', 50),
        row('drawify', '2026-10-25', 1),
        row('drawify', '2026-10-18', 1),
      ],
      '2026-11-01',
    );

    expect(scores.get('books')).toBe(2);
    expect(scores.get('music')).toBe(1);
    expect(scores.get('drawify')).toBeCloseTo(0.75);
  });
});

describe('rankByUsage', () => {
  it('puts the most used first and keeps the given order for ties and unused apps', () => {
    const apps = ['books', 'drawify', 'music', 'photos', 'films'].map(app);
    const rows = [
      row('films', '2026-11-01', 3),
      row('music', '2026-11-01', 1),
      row('photos', '2026-11-01', 1),
    ];

    expect(rankByUsage(apps, rows, '2026-11-01').map((a) => a.id)).toEqual([
      'films',
      'music',
      'photos',
      'books',
      'drawify',
    ]);
    expect(rankByUsage(apps, [], '2026-11-01')).toEqual(apps);
  });
});
