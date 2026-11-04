import { missingOccurrences, occurrences, type RuleLike, weekdayName } from './recurring';

const monthly = (day: number, over: Partial<RuleLike> = {}): RuleLike => ({
  frequency: 'monthly',
  day,
  startDate: '2026-01-01',
  endDate: null,
  ...over,
});

describe('occurrences', () => {
  it('finds each month on the day', () => {
    expect(occurrences(monthly(15), '2026-01-01', '2026-03-31')).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
    ]);
  });

  it('clamps the 31st to the end of shorter months', () => {
    expect(occurrences(monthly(31), '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('finds every chosen weekday, weekly', () => {
    const weekly: RuleLike = {
      frequency: 'weekly',
      day: 1,
      startDate: '2026-11-01',
      endDate: null,
    };

    expect(occurrences(weekly, '2026-11-01', '2026-11-20')).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
    ]);
  });

  it('respects the start and a stop date, and an empty range', () => {
    expect(
      occurrences(monthly(15, { startDate: '2026-02-20' }), '2026-01-01', '2026-04-30'),
    ).toEqual(['2026-03-15', '2026-04-15']);
    expect(occurrences(monthly(15, { endDate: '2026-02-15' }), '2026-01-01', '2026-04-30')).toEqual(
      ['2026-01-15', '2026-02-15'],
    );
    expect(occurrences(monthly(15), '2026-05-01', '2026-04-01')).toEqual([]);
  });
});

describe('missingOccurrences', () => {
  it('skips what already exists, so opening the app twice creates nothing new', () => {
    const rule = monthly(1);

    expect(missingOccurrences(rule, new Set(['2026-01-01', '2026-02-01']), '2026-04-10')).toEqual([
      '2026-03-01',
      '2026-04-01',
    ]);
    expect(
      missingOccurrences(
        rule,
        new Set(['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']),
        '2026-04-10',
      ),
    ).toEqual([]);
  });
});

describe('weekdayName', () => {
  it('names Monday to Sunday', () => {
    expect(weekdayName(1)).toBe('Monday');
    expect(weekdayName(7)).toBe('Sunday');
  });
});
