import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { nextLocalMidnight, useToday } from './use-today';

describe('nextLocalMidnight', () => {
  it('is the start of the next local day, also on the days the clocks change', () => {
    for (const now of [
      new Date(2026, 10, 1, 23, 59, 59),
      new Date(2026, 11, 31, 8),
      new Date(2026, 2, 29, 1, 30), // spring forward in Europe
      new Date(2026, 9, 25, 2, 30), // fall back in Europe
    ]) {
      const midnight = nextLocalMidnight(now);
      expect(midnight.getHours()).toBe(0);
      expect(midnight.getMinutes()).toBe(0);
      expect(midnight > now).toBe(true);
      expect(midnight.getTime() - now.getTime()).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
    }
    expect(nextLocalMidnight(new Date(2026, 11, 31, 8)).getFullYear()).toBe(2027);
  });
});

describe('useToday', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('changes at local midnight and when the app comes back, and cleans up on unmount', async () => {
    let onChange: (state: AppStateStatus) => void = () => {};
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onChange = listener as typeof onChange;
      return { remove };
    });
    jest.useFakeTimers({ now: new Date(2026, 9, 31, 23, 59, 50) });
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');

    const { result, unmount } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-10-31');

    // Open over midnight: the next day starts without leaving the screen.
    await act(() => jest.advanceTimersByTime(10_000));
    expect(result.current).toBe('2026-11-01');

    // Back from the background two days later.
    jest.setSystemTime(new Date(2026, 10, 3, 9));
    await act(() => onChange('active'));
    expect(result.current).toBe('2026-11-03');

    // The renderer keeps timers of its own, so check that ours is the one cleared.
    const midnightTimer = setTimeoutSpy.mock.results.at(-1)?.value;
    await unmount();
    expect(remove).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(midnightTimer);
  });
});
