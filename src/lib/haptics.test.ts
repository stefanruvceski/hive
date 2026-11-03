import { ImpactFeedbackStyle, impactAsync, selectionAsync } from 'expo-haptics';

import { liftHaptic, tapHaptic } from './haptics';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

describe('haptics', () => {
  it('plays a light impact for a tap and a selection tick for a lift', () => {
    tapHaptic();
    liftHaptic();

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('swallows a device without haptics', async () => {
    jest.mocked(impactAsync).mockRejectedValueOnce(new Error('unsupported'));

    expect(() => tapHaptic()).not.toThrow();
    await Promise.resolve();
  });
});
