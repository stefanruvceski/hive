import {
  amountProgress,
  amountFractions,
  amountStep,
  shortAmount,
  countingCompletions,
  doneDatesFor,
  formatAmount,
  isMeasurable,
  isValidGoal,
  periodAmount,
  setAmount,
} from './goal';

const water = { id: 'water', target: 8 };
const run = { id: 'run', target: null };

describe('isMeasurable', () => {
  it.each([
    [{ target: 8 }, true],
    [{ target: 0.5 }, true],
    [{ target: 0 }, false],
    [{ target: null }, false],
    [{}, false],
  ])('%j -> %s', (habit, expected) => {
    expect(isMeasurable(habit)).toBe(expected);
  });
});

describe('countingCompletions', () => {
  it('keeps measurable days only when the target is reached, and plain days always', () => {
    const rows = [
      { habitId: 'water', date: '2026-11-01', amount: 8 },
      { habitId: 'water', date: '2026-11-02', amount: 12 },
      { habitId: 'water', date: '2026-11-03', amount: 5 },
      { habitId: 'water', date: '2026-11-04', amount: null },
      { habitId: 'run', date: '2026-11-03', amount: null },
      { habitId: 'run', date: '2026-11-04', amount: 3 },
      { habitId: 'gone', date: '2026-11-04', amount: null },
    ];
    expect(
      countingCompletions([water, run], rows).map((row) => `${row.habitId}:${row.date}`),
    ).toEqual([
      'water:2026-11-01',
      'water:2026-11-02',
      'water:2026-11-04',
      'run:2026-11-03',
      'run:2026-11-04',
    ]);
  });
});

describe('doneDatesFor', () => {
  it('lists the done days of each habit', () => {
    const map = doneDatesFor(
      [water, run],
      [
        { habitId: 'water', date: '2026-11-01', amount: 8 },
        { habitId: 'water', date: '2026-11-02', amount: 2 },
        { habitId: 'run', date: '2026-11-02' },
      ],
    );
    expect([...(map.get('water') ?? [])]).toEqual(['2026-11-01']);
    expect([...(map.get('run') ?? [])]).toEqual(['2026-11-02']);
  });
});

describe('periodAmount', () => {
  it.each([
    ['sum', 6],
    ['avg', 2],
    ['max', 3],
    ['last', 3],
  ] as const)('%s of 1, 2, 3 is %i', (aggregation, expected) => {
    expect(periodAmount(aggregation, [1, 2, 3])).toBe(expected);
  });

  it('is 0 without amounts', () => {
    expect(periodAmount('sum', [])).toBe(0);
    expect(periodAmount('avg', [])).toBe(0);
  });
});

describe('formatAmount', () => {
  it.each([
    [3, 'glasses', '3 glasses'],
    [2.5, 'L', '2.5 L'],
    [0.333333, 'kg', '0.33 kg'],
    [1000, '', '1000'],
    [3, undefined, '3'],
  ])('%d %j -> %j', (amount, unit, text) => {
    expect(formatAmount(amount, unit)).toBe(text);
  });
});

describe('amountProgress', () => {
  it.each([
    [5, 8, 0.625],
    [8, 8, 1],
    [12, 8, 1],
    [0, 8, 0],
    [3, 0, 0],
  ])('%d of %d -> %d', (amount, target, expected) => {
    expect(amountProgress(amount, target)).toBe(expected);
  });
});

describe('setAmount', () => {
  const rows = [
    { habitId: 'water', date: '2026-11-01', amount: 3 },
    { habitId: 'run', date: '2026-11-01', amount: null },
  ];

  it('replaces the amount of that habit and day, keeping the rest', () => {
    expect(setAmount(rows, { habitId: 'water', date: '2026-11-01', amount: 8 })).toEqual([
      { habitId: 'run', date: '2026-11-01', amount: null },
      { habitId: 'water', date: '2026-11-01', amount: 8 },
    ]);
  });

  it('adds a day that had none, and clears one with null', () => {
    expect(setAmount(rows, { habitId: 'water', date: '2026-11-02', amount: 2 })).toHaveLength(3);
    expect(setAmount(rows, { habitId: 'water', date: '2026-11-01', amount: null })).toEqual([
      { habitId: 'run', date: '2026-11-01', amount: null },
    ]);
  });
});

describe('isValidGoal', () => {
  it.each([
    [{ unit: 'glasses', target: 8, aggregation: 'sum' } as const, true],
    [{ unit: '', target: 0.5, aggregation: 'max' } as const, true],
    [{ unit: 'glasses', target: 0, aggregation: 'sum' } as const, false],
    [{ unit: 'glasses', target: Number.NaN, aggregation: 'sum' } as const, false],
  ])('%j -> %s', (goal, expected) => {
    expect(isValidGoal(goal)).toBe(expected);
  });
});

describe('amountStep', () => {
  it.each([
    [0.5, 0.1],
    [2, 0.5],
    [4.5, 0.5],
    [5, 1],
    [30, 1],
  ])('target %d steps by %d', (target, step) => {
    expect(amountStep(target)).toBe(step);
  });
});

describe('shortAmount', () => {
  it.each([
    [0, '0'],
    [5, '5'],
    [2.5, '2.5'],
    [0.333333, '0.33'],
    [999, '999'],
    [1000, '1k'],
    [1250, '1.3k'],
    [9999, '10k'],
    [12345, '12k'],
    [1500000, '1.5M'],
  ])('%d -> %s', (amount, text) => {
    expect(shortAmount(amount)).toBe(text);
  });
});

describe('amountFractions', () => {
  it('maps each day to how far it got to the target, a day without an amount counting as done', () => {
    const fractions = amountFractions(8, [
      { habitId: 'water', date: '2026-11-01', amount: 2 },
      { habitId: 'water', date: '2026-11-02', amount: 8 },
      { habitId: 'water', date: '2026-11-03', amount: 20 },
      { habitId: 'water', date: '2026-11-04', amount: null },
      { habitId: 'water', date: '2026-11-05' },
    ]);
    expect([...fractions]).toEqual([
      ['2026-11-01', 0.25],
      ['2026-11-02', 1],
      ['2026-11-03', 1],
      ['2026-11-04', 1],
      ['2026-11-05', 1],
    ]);
  });
});
