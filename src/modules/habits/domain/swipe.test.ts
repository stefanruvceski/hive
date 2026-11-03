import { swipeOutcome } from './swipe';

// A 360-wide row, a 160 trailing panel (Edit + Archive) and an 80 leading panel (Edit).
const base = { width: 360, leadingPanel: 80, trailingPanel: 160 };

describe('swipeOutcome', () => {
  it.each([
    // [offset, velocity, expected]
    [0, 0, { kind: 'close' }],
    [-40, 0, { kind: 'close' }],
    [-80, 0, { kind: 'open', side: 'trailing' }],
    [-100, 0, { kind: 'open', side: 'trailing' }],
    [-40, -800, { kind: 'open', side: 'trailing' }],
    [-100, 800, { kind: 'close' }],
    [-200, 0, { kind: 'full', side: 'trailing' }],
    [-300, 800, { kind: 'full', side: 'trailing' }],
    [30, 0, { kind: 'close' }],
    [40, 0, { kind: 'open', side: 'leading' }],
    [20, 800, { kind: 'open', side: 'leading' }],
    [60, -800, { kind: 'close' }],
    [200, 0, { kind: 'full', side: 'leading' }],
  ] as const)('offset %d at velocity %d → %j', (offset, velocity, want) => {
    expect(swipeOutcome({ ...base, offset, velocity })).toEqual(want);
  });
});
