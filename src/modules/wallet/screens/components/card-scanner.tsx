import { CameraView, useCameraPermissions } from 'expo-camera';
import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout, Spacing } from '@/constants/theme';

import { type CardFormat, fromScanner, scannerTypes } from '../../domain/card-format';

type Props = {
  onScanned: (data: string, format: CardFormat | null) => void;
  onClose: () => void;
};

/** The camera for scanning a card. Without permission the user can still type the number. */
export function CardScanner({ onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View style={styles.box} testID="wallet-scanner-loading" />;

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    return (
      <View style={styles.box} testID="wallet-scanner-denied">
        <ThemedText role="alert" style={styles.text}>
          {canAsk
            ? 'Hive needs the camera to scan a card. You can also type the number.'
            : 'Camera access is off. Turn it on in Settings, or type the number.'}
        </ThemedText>
        <PrimaryButton
          label={canAsk ? 'Allow camera' : 'Open Settings'}
          onPress={() => (canAsk ? void requestPermission() : void Linking.openSettings())}
          testID={canAsk ? 'wallet-scanner-allow' : 'wallet-scanner-settings'}
        />
        <PrimaryButton label="Type the number" onPress={onClose} testID="wallet-scanner-close" />
      </View>
    );
  }

  return (
    <View style={styles.box} testID="wallet-scanner">
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...scannerTypes] }}
        onBarcodeScanned={({ data, type }) => onScanned(data, fromScanner(type))}
      />
      <PrimaryButton label="Type the number" onPress={onClose} testID="wallet-scanner-close" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.three, alignItems: 'stretch' },
  camera: { height: 260, borderRadius: Layout.radius.list, overflow: 'hidden' },
  text: { textAlign: 'center' },
});
