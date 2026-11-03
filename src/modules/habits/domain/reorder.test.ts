import {
  applyDrop,
  hitTest,
  indicatorFor,
  moveBy,
  withChanges,
  orderRows,
  type PartLayout,
  type Row,
} from './reorder';

const row = (
  kind: Row['kind'],
  id: string,
  timeOfDay: Row['timeOfDay'],
  position: number,
  visible = true,
): Row => ({ kind, id, timeOfDay, position, visible });

const rect = (y: number, height: number) => ({ x: 16, y, width: 360, height });

describe('orderRows', () => {
  it('orders by part of the day, then position, a habit before a to-do at the same position', () => {
    const rows = [
      row('todo', 't', 'morning', 2),
      row('habit', 'late', 'evening', 0),
      row('habit', 'h', 'morning', 2),
      row('habit', 'first', 'morning', 1),
      row('habit', 'any', 'anytime', 0),
    ];
    expect(orderRows(rows).map((r) => r.id)).toEqual(['first', 'h', 't', 'late', 'any']);
  });
});

// Two parts: Morning (two rows) and Afternoon (one row); a part's card starts under its header.
const parts: PartLayout[] = [
  {
    timeOfDay: 'morning',
    rect: rect(0, 300),
    card: rect(40, 120),
    rows: [
      { key: 'habit-a', rect: rect(40, 60) },
      { key: 'todo-b', rect: rect(100, 60) },
    ],
  },
  {
    timeOfDay: 'afternoon',
    rect: rect(200, 200),
    card: rect(240, 60),
    rows: [{ key: 'habit-c', rect: rect(240, 60) }],
  },
];

describe('hitTest', () => {
  it.each([
    ['above the first row', 'habit-c', 45, { timeOfDay: 'morning', index: 0 }],
    ['between the rows', 'habit-c', 100, { timeOfDay: 'morning', index: 1 }],
    ['below the last row of the part', 'habit-c', 170, { timeOfDay: 'morning', index: 2 }],
    ['in the next part', 'habit-a', 250, { timeOfDay: 'afternoon', index: 0 }],
    ['past the end of the list', 'habit-a', 900, { timeOfDay: 'afternoon', index: 1 }],
    ['above the whole list', 'habit-c', -50, { timeOfDay: 'morning', index: 0 }],
  ])('%s', (_name, dragKey, y, expected) => {
    expect(hitTest(dragKey, y, parts)).toEqual(expected);
  });

  it('does not count the dragged row', () => {
    // Over the lower half of the dragged row's own place: index 1 counts only the other row.
    expect(hitTest('todo-b', 140, parts)).toEqual({ timeOfDay: 'morning', index: 1 });
  });
});

describe('indicatorFor', () => {
  it('sits on the top of the row it would go before', () => {
    expect(indicatorFor('habit-c', { timeOfDay: 'morning', index: 1 }, parts)).toEqual({
      x: 16,
      width: 360,
      y: 100,
    });
  });

  it('sits under the last row at the end of a part', () => {
    expect(indicatorFor('habit-a', { timeOfDay: 'afternoon', index: 1 }, parts)?.y).toBe(300);
  });

  it('sits in the middle of an empty part', () => {
    const withEmpty = [
      ...parts,
      { timeOfDay: 'evening' as const, rect: rect(400, 100), card: rect(440, 40), rows: [] },
    ];
    expect(indicatorFor('habit-a', { timeOfDay: 'evening', index: 0 }, withEmpty)?.y).toBe(460);
  });
});

describe('applyDrop', () => {
  const rows = [
    row('habit', 'a', 'morning', 0),
    row('todo', 'b', 'morning', 1),
    row('habit', 'c', 'afternoon', 2),
    row('habit', 'd', 'afternoon', 3),
  ];
  const positions = (changes: ReturnType<typeof applyDrop>) =>
    Object.fromEntries(changes.map((c) => [c.id, [c.position, c.timeOfDay]]));

  it('changes nothing when it is dropped where it was', () => {
    expect(applyDrop(rows, 'habit-a', { timeOfDay: 'morning', index: 0 })).toEqual([]);
    expect(applyDrop(rows, 'todo-b', { timeOfDay: 'morning', index: 1 })).toEqual([]);
  });

  it('moves a row within its part', () => {
    expect(positions(applyDrop(rows, 'todo-b', { timeOfDay: 'morning', index: 0 }))).toEqual({
      b: [0, 'morning'],
      a: [1, 'morning'],
    });
  });

  it('moves a row to another part and gives it that part of the day', () => {
    expect(positions(applyDrop(rows, 'habit-a', { timeOfDay: 'afternoon', index: 1 }))).toEqual({
      b: [0, 'morning'],
      c: [1, 'afternoon'],
      a: [2, 'afternoon'],
    });
  });

  it('puts a row into an empty part at the end when no later part has rows', () => {
    expect(positions(applyDrop(rows, 'habit-d', { timeOfDay: 'evening', index: 0 }))).toEqual({
      d: [3, 'evening'],
    });
  });

  it('puts a row into an empty part in the middle of the list', () => {
    const gap = [row('habit', 'a', 'morning', 0), row('habit', 'z', 'evening', 1)];
    expect(positions(applyDrop(gap, 'habit-z', { timeOfDay: 'afternoon', index: 0 }))).toEqual({
      z: [1, 'afternoon'],
    });
  });

  it('keeps a hidden row where it is relative to the visible ones', () => {
    const withHidden = [
      row('habit', 'a', 'morning', 0),
      row('habit', 'off', 'morning', 1, false),
      row('habit', 'b', 'morning', 2),
      row('habit', 'c', 'afternoon', 3),
    ];
    // Dropped before the last visible row of Morning: it goes in front of `b`, after `off`.
    expect(positions(applyDrop(withHidden, 'habit-c', { timeOfDay: 'morning', index: 1 }))).toEqual(
      {
        c: [2, 'morning'],
        b: [3, 'morning'],
      },
    );
  });
});

describe('moveBy', () => {
  const rows = [
    row('habit', 'a', 'morning', 0),
    row('habit', 'b', 'morning', 1),
    row('habit', 'c', 'afternoon', 2),
    row('habit', 'off', 'afternoon', 3, false),
  ];

  it('moves a row one place within its part', () => {
    expect(moveBy(rows, 'habit-b', -1)).toEqual({ timeOfDay: 'morning', index: 0 });
    expect(moveBy(rows, 'habit-a', 1)).toEqual({ timeOfDay: 'morning', index: 1 });
  });

  it('crosses into the next part at the end of a part', () => {
    expect(moveBy(rows, 'habit-b', 1)).toEqual({ timeOfDay: 'afternoon', index: 0 });
    expect(moveBy(rows, 'habit-c', -1)).toEqual({ timeOfDay: 'morning', index: 2 });
  });

  it('has nowhere to go past the ends of the list', () => {
    expect(moveBy(rows, 'habit-a', -1)).toBeNull();
    expect(moveBy(rows, 'habit-c', 1)).toBeNull();
  });
});

describe('withChanges', () => {
  const items = [
    { id: 'a', timeOfDay: 'morning' as const, position: 0 },
    { id: 'b', timeOfDay: 'morning' as const, position: 1 },
  ];

  it('applies the changes that name an item of that kind', () => {
    const changes = [
      { kind: 'habit' as const, id: 'a', position: 5, timeOfDay: 'evening' as const },
      { kind: 'todo' as const, id: 'b', position: 9, timeOfDay: 'evening' as const },
    ];
    expect(withChanges(items, 'habit', changes)).toEqual([
      { id: 'a', timeOfDay: 'evening', position: 5 },
      items[1],
    ]);
  });
});
