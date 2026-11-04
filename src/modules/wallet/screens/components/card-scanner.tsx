import { type BarcodeType, CameraView, useCameraPermissions } from 'expo-camera';
import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout, Spacing } from '@/constants/theme';

import { type CardFormat, fromScanner, scannerTypes } from '../../domain/card-format';

type Props = {
  /** Only these codes are read; all card types by default, `['qr']` for a receipt. */
  barcodeTypes?: readonly BarcodeType[];
  onScanned: (data: string, format: CardFormat | null) => void;
  onClose: () => void;
};

/** The camera for scanning a card. Without permission the user can still type the number. */
export function CardScanner({ barcodeTypes = scannerTypes, onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View style={styles.box} testID="wallet-scanner-loading" />;

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    return (
      <View style={styles.box} testID="wallet-scanner-denied">
        <ThemedText role="alert" style={styles.text}>
          {canAsk
            ? 'Hive needs the camera to scan. You can also type it in.'
            : 'Camera access is off. Turn it on in Settings, or type it in.'}
        </ThemedText>
        <PrimaryButton
          label={canAsk ? 'Allow camera' : 'Open Settings'}
          onPress={() => (canAsk ? void requestPermission() : void Linking.openSettings())}
          testID={canAsk ? 'wallet-scanner-allow' : 'wallet-scanner-settings'}
        />
        <PrimaryButton label="Type it in" onPress={onClose} testID="wallet-scanner-close" />
      </View>
    );
  }

  return (
    <View style={styles.box} testID="wallet-scanner">
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...barcodeTypes] }}
        onBarcodeScanned={({ data, type }) => onScanned(data, fromScanner(type))}
      />
      <PrimaryButton label="Type it in" onPress={onClose} testID="wallet-scanner-close" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.three, alignItems: 'stretch' },
  camera: { height: 260, borderRadius: Layout.radius.row, overflow: 'hidden' },
  text: { textAlign: 'center' },
});
