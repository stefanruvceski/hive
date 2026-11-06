import { act, renderHook } from '@testing-library/react-native';
import { scanFromURLAsync } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { usePhotoScan } from './use-photo-scan';

jest.mock('expo-camera', () => ({ scanFromURLAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const picked = (uri?: string) =>
  jest
    .mocked(launchImageLibraryAsync)
    .mockResolvedValue(
      (uri ? { canceled: false, assets: [{ uri }] } : { canceled: true, assets: null }) as never,
    );

beforeEach(() => jest.clearAllMocks());

describe('usePhotoScan', () => {
  it('reads the first code in the picked photo', async () => {
    picked('file:///a.jpg');
    jest
      .mocked(scanFromURLAsync)
      .mockResolvedValue([{ type: 'ean13', data: '4006381333931' }] as never);
    const { result } = await renderHook(() => usePhotoScan());

    let scan;
    await act(async () => {
      scan = await result.current.pick();
    });
    expect(scan).toEqual({ data: '4006381333931', format: 'EAN_13' });
    expect(scanFromURLAsync).toHaveBeenCalledWith('file:///a.jpg', expect.any(Array));
    expect(result.current.error).toBeNull();
  });

  it('says so when the photo has no code', async () => {
    picked('file:///a.jpg');
    jest.mocked(scanFromURLAsync).mockResolvedValue([]);
    const { result } = await renderHook(() => usePhotoScan());

    await act(async () => {
      expect(await result.current.pick()).toBeNull();
    });
    expect(result.current.error).toMatch(/No barcode or QR code/);
  });

  it('does nothing when the picker is cancelled', async () => {
    picked();
    const { result } = await renderHook(() => usePhotoScan());

    await act(async () => {
      expect(await result.current.pick()).toBeNull();
    });
    expect(scanFromURLAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('explains a photo that cannot be read', async () => {
    picked('file:///bad.jpg');
    jest.mocked(scanFromURLAsync).mockRejectedValue(new Error('decode'));
    const { result } = await renderHook(() => usePhotoScan(['qr']));

    await act(async () => {
      expect(await result.current.pick()).toBeNull();
    });
    expect(result.current.error).toMatch(/Could not read/);
  });
});
