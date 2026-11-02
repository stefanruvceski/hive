import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceMotion } from './use-reduce-motion';

describe('useReduceMotion', () => {
  it("reads the phone's setting, follows changes and stops listening on unmount", async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const remove = jest.fn();
    let onChange: (enabled: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, handler) => {
      onChange = handler as (enabled: boolean) => void;
      return { remove } as never;
    });

    const { result, unmount } = await renderHook(() => useReduceMotion());
    await waitFor(() => expect(result.current).toBe(true));

    await act(async () => onChange(false));
    expect(result.current).toBe(false);

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
