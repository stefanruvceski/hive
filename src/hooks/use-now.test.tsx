import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useNow } from './use-now';

describe('useNow', () => {
  it('re-reads the clock when the app comes back to the foreground, and stops listening on unmount', async () => {
    let onChange: (state: AppStateStatus) => void = () => {};
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onChange = listener as typeof onChange;
      return { remove };
    });
    jest.useFakeTimers({ now: new Date(2026, 9, 31, 9) });

    const { result, unmount } = await renderHook(() => useNow());
    expect(result.current.getHours()).toBe(9);

    jest.setSystemTime(new Date(2026, 10, 1, 20));
    await act(() => onChange('background'));
    expect(result.current.getHours()).toBe(9);
    await act(() => onChange('active'));
    expect(result.current.getDate()).toBe(1);
    expect(result.current.getHours()).toBe(20);

    await unmount();
    expect(remove).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
