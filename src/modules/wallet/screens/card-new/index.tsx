import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
import { TextButton } from '../components/text-button';
import { usePhotoScan } from '../components/use-photo-scan';
import { WalletScreen } from '../components/wallet-screen';

const formatOptions = (qrFirst: boolean) =>
  [...drawableFormats]
    .sort((a, b) => Number(qrFirst && b === 'QR_CODE') - Number(qrFirst && a === 'QR_CODE'))
    .map((value) => ({ value, label: formatLabel(value) }));

/** Add a card: scan it with the camera or type the number, name it, pick a color and save. */
export function WalletCardNew() {
  const scheme = useThemeName();
  const create = useCreateCard();
  // The camera is open from the start: scanning is the way in, typing the way out.
  const [scanning, setScanning] = useState(true);
  const [number, setNumber] = useState('');
  const [chosen, setChosen] = useState<CardFormat | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(defaultCardColor);
  const [note, setNote] = useState('');
  // The program the scan pointed at: it brings its own face, so the color does not apply.
  const [recognised, setRecognised] = useState<CardBrand | null>(null);
  const [scannedQr, setScannedQr] = useState(false);
  // The number and name fields stay out of the way until they are needed: when the user chooses
  // to type, or when a scan did not tell which program the card is.
  const [typing, setTyping] = useState(false);
  const [scanned, setScanned] = useState(false);
  const showNumber = typing;
  const showName = typing || (scanned && recognised === null);
  // A scan tells the barcode type, and a known program brings its own colors; ask only for the rest.
  const showFormat = typing || (scanned && chosen === null);
  const showColor = typing || (scanned && recognised === null);

  const photo = usePhotoScan();

  const applyScan = (data: string, scannedFormat: CardFormat | null) => {
    setNumber(data);
    setChosen(scannedFormat && isDrawable(scannedFormat) ? scannedFormat : null);
    setScannedQr(scannedFormat === 'QR_CODE');
    const brand = recognizeCard(data);
    setRecognised(brand);
    if (brand) setName(brand.name);
    setScanned(true);
  };

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
          onScanned={(data, scannedFormat) => {
            applyScan(data, scannedFormat);
            setScanning(false);
          }}
          onClose={() => {
            setScanning(false);
            setTyping(true);
          }}
        />
      ) : (
        <Pressable
          role="button"
          aria-label="Scan the card again"
          onPress={() => setScanning(true)}
          testID="wallet-card-preview">
          <CardFace
            look={cardLook(recognised?.name ?? name, cardColor(color, scheme))}
            name={name.trim() || 'Card name'}
          />
        </Pressable>
      )}
      {scanning ? null : (
        <ThemedText type="hint" testID="wallet-card-rescan-hint">
          Tap the card to scan it again.
        </ThemedText>
      )}
      <TextButton
        label="Choose from photos"
        onPress={() =>
          void photo.pick().then((scan) => {
            if (!scan) return;
            applyScan(scan.data, scan.format);
            setScanning(false);
          })
        }
        testID="wallet-card-photo"
      />
      {photo.error ? (
        <ThemedText role="alert" themeColor="danger" testID="wallet-card-photo-problem">
          {photo.error}
        </ThemedText>
      ) : null}
      {showNumber ? (
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
      ) : null}
      {issue ? (
        <ThemedText role="alert" themeColor="danger" testID="wallet-card-problem">
          {issue}
        </ThemedText>
      ) : null}
      {showName ? (
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Shop or brand"
          maxLength={40}
          testID="wallet-card-name"
        />
      ) : null}
      {showName && suggestions.length > 0 ? (
        <Chips
          label="Suggestions"
          options={suggestions.map(({ name: value }) => ({ value, label: value }))}
          value={name}
          onChange={setName}
          testID="wallet-card-suggestion"
        />
      ) : null}
      {showFormat ? (
        <Chips
          label="Barcode type"
          options={formatOptions(scannedQr)}
          value={format}
          onChange={setChosen}
          testID="wallet-card-format"
          maxRows={1}
        />
      ) : null}
      {showColor ? (
        <Chips
          label="Color"
          options={cardColorKeys.map((value) => ({ value, label: value }))}
          value={color as (typeof cardColorKeys)[number]}
          onChange={setColor}
          testID="wallet-card-color"
        />
      ) : null}
      {recognised ? (
        <ThemedText type="hint" testID="wallet-card-recognised">
          {`Recognised: ${recognised.name}. It uses its own colors.`}
        </ThemedText>
      ) : null}
      <Field label="Note" value={note} onChangeText={setNote} testID="wallet-card-note" />
    </WalletScreen>
  );
}
