import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useThemeName } from '@/hooks/use-theme';

import { useCreateCard } from '../../data/queries';
import { guess, problem } from '../../domain/barcodes';
import { cardLook, suggestBrands } from '../../domain/card-brands';
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

const formatOptions = drawableFormats.map((value) => ({ value, label: formatLabel(value) }));

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
      trailing={
        <PrimaryButton
          label="Save"
          size="compact"
          disabled={!canSave}
          onPress={save}
          testID="wallet-card-save"
        />
      }>
      {scanning ? (
        <CardScanner
          onScanned={(data, scanned) => {
            setNumber(data);
            setChosen(scanned && isDrawable(scanned) ? scanned : null);
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
        options={formatOptions}
        value={format}
        onChange={setChosen}
        testID="wallet-card-format"
        rows={1}
      />
      <Chips
        label="Color"
        options={cardColorKeys.map((value) => ({ value, label: value }))}
        value={color as (typeof cardColorKeys)[number]}
        onChange={setColor}
        testID="wallet-card-color"
        rows={2}
      />
      <View style={styles.preview}>
        <CardFace
          look={cardLook(name, cardColor(color, scheme))}
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
