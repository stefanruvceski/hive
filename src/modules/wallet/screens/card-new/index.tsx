import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SaveButton } from '@/components/ui/save-button';
import { useThemeName } from '@/hooks/use-theme';

import { useCreateCard } from '../../data/queries';
import { guess, problem } from '../../domain/barcodes';
import { type CardBrand, cardLook, recognizeCard, suggestBrands } from '../../domain/card-brands';
import { cardColor, cardColorKeys, defaultCardColor } from '../../domain/card-colors';
import {
  type CardFormat,
  drawableFormats,
  formatLabel,
  isDrawable,
} from '../../domain/card-format';
import { CardFace } from '../components/card-face';
import { CardScanner } from '../components/card-scanner';
import { Chips, Field } from '../components/form';
import { WalletScreen } from '../components/wallet-screen';

const formatOptions = (qrFirst: boolean) =>
  [...drawableFormats]
    .sort((a, b) => Number(qrFirst && b === 'QR_CODE') - Number(qrFirst && a === 'QR_CODE'))
    .map((value) => ({ value, label: formatLabel(value) }));

/** Add a card: scan it with the camera or type the number, name it, pick a color and save. */
export function WalletCardNew() {
  const scheme = useThemeName();
  const create = useCreateCard();
  const [scanning, setScanning] = useState(false);
  const [number, setNumber] = useState('');
  const [chosen, setChosen] = useState<CardFormat | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(defaultCardColor);
  const [note, setNote] = useState('');
  // The program the scan pointed at: it brings its own face, so the color does not apply.
  const [recognised, setRecognised] = useState<CardBrand | null>(null);
  const [scannedQr, setScannedQr] = useState(false);

  const format = chosen ?? guess(number);
  const issue = number.trim() ? problem(number, format) : null;
  const suggestions = suggestBrands(name).filter((b) => b.name !== name.trim());
  const canSave = name.trim().length > 0 && number.trim().length > 0 && !issue && !create.isPending;

  const save = () => {
    if (!canSave) return;
    create.mutate({ name, number, format, color, note }, { onSuccess: () => router.back() });
  };

  return (
    <WalletScreen
      id="wallet-card-new"
      title="New card"
      trailing={<SaveButton disabled={!canSave} onPress={save} testID="wallet-card-save" />}>
      {scanning ? (
        <CardScanner
          onScanned={(data, scanned) => {
            setNumber(data);
            setChosen(scanned && isDrawable(scanned) ? scanned : null);
            setScannedQr(scanned === 'QR_CODE');
            const brand = recognizeCard(data);
            setRecognised(brand);
            if (brand) setName(brand.name);
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      ) : (
        <PrimaryButton
          label="Scan with camera"
          onPress={() => setScanning(true)}
          testID="wallet-card-scan"
        />
      )}
      <Field
        label="Card number"
        value={number}
        onChangeText={(text) => {
          setNumber(text);
          setChosen(null);
          setScannedQr(false);
          setRecognised(null);
        }}
        autoCapitalize="characters"
        placeholder="Number under the barcode"
        testID="wallet-card-number"
      />
      {issue ? (
        <ThemedText role="alert" themeColor="danger" testID="wallet-card-problem">
          {issue}
        </ThemedText>
      ) : null}
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Shop or brand"
        maxLength={40}
        testID="wallet-card-name"
      />
      {suggestions.length > 0 ? (
        <Chips
          label="Suggestions"
          options={suggestions.map(({ name: value }) => ({ value, label: value }))}
          value={name}
          onChange={setName}
          testID="wallet-card-suggestion"
        />
      ) : null}
      <Chips
        label="Barcode type"
        options={formatOptions(scannedQr)}
        value={format}
        onChange={setChosen}
        testID="wallet-card-format"
      />
      <Chips
        label="Color"
        options={cardColorKeys.map((value) => ({ value, label: value }))}
        value={color as (typeof cardColorKeys)[number]}
        onChange={setColor}
        testID="wallet-card-color"
        disabled={recognised !== null}
      />
      {recognised ? (
        <ThemedText type="hint" testID="wallet-card-recognised">
          {`Recognised: ${recognised.name}. It uses its own colors.`}
        </ThemedText>
      ) : null}
      <View style={styles.preview}>
        <CardFace
          look={cardLook(recognised?.name ?? name, cardColor(color, scheme))}
          name={name.trim() || 'Card name'}
          testID="wallet-card-preview"
        />
      </View>
      <Field label="Note" value={note} onChangeText={setNote} testID="wallet-card-note" />
    </WalletScreen>
  );
}

const styles = StyleSheet.create({
  preview: { width: '62%' },
});
