import { formatDate } from './format-date';

describe('formatDate', () => {
  it('formats a Date', () => {
    expect(formatDate(new Date(2026, 0, 15))).toMatch(/2026/);
  });

  it('accepts ISO strings and timestamps', () => {
    const iso = formatDate('2026-06-01T12:00:00Z');
    const ts = formatDate(Date.UTC(2026, 5, 1, 12));
    expect(iso).toBe(ts);
  });
});
