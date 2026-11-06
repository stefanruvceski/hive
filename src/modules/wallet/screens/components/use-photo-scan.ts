import { type BarcodeType, scanFromURLAsync } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useState } from 'react';

import { type CardFormat, fromScanner, scannerTypes } from '../../domain/card-format';

export type PhotoScan = { data: string; format: CardFormat | null };

/**
 * Pick a photo (or screenshot) from the library and read the first barcode in it. Nothing is
 * uploaded: the picture is decoded on the phone. `error` says why there is no result.
 */
export function usePhotoScan(barcodeTypes: readonly BarcodeType[] = scannerTypes) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (): Promise<PhotoScan | null> => {
    setError(null);
    setBusy(true);
    try {
      const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      const uri = picked.canceled ? undefined : picked.assets[0]?.uri;
      if (!uri) return null;
      const found = (await scanFromURLAsync(uri, [...barcodeTypes]))[0];
      if (!found) {
        setError('No barcode or QR code found in this photo. Try a sharper, closer picture.');
        return null;
      }
      return { data: found.data, format: fromScanner(found.type) };
    } catch {
      setError('Could not read this photo. Try another one.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { pick, busy, error };
}
