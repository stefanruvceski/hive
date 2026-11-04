import {
  addDays,
  daysInMonth,
  isIsoDate,
  isoWeekday,
  monthBounds,
  monthLabel,
  monthOf,
  shiftMonth,
} from './dates';

describe('dates', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('knows the weekday (Monday = 1, Sunday = 7)', () => {
    expect(isoWeekday('2026-11-02')).toBe(1);
    expect(isoWeekday('2026-11-08')).toBe(7);
  });

  it('knows month lengths, leap years included', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-11')).toBe(30);
  });

  it('shifts months over year ends', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 2)).toBe('2027-01');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
  });

  it('labels and bounds a month', () => {
    expect(monthLabel('2026-11')).toBe('November 2026');
    expect(monthBounds('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthOf('2026-11-03')).toBe('2026-11');
  });

  it('validates dates', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-11-03')).toBe(true);
    expect(isIsoDate('11/03/2026')).toBe(false);
  });
});
