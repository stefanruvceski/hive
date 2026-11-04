// Loyalty card barcode types (pure). Stored as the `format` text of `wallet_cards`.

export const cardFormats = [
  'CODE_128',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'CODE_39',
  'CODE_93',
  'ITF',
  'CODABAR',
  'QR_CODE',
  'PDF_417',
  'AZTEC',
  'DATA_MATRIX',
] as const;

export type CardFormat = (typeof cardFormats)[number];

const labels: Record<CardFormat, string> = {
  CODE_128: 'Code 128',
  EAN_13: 'EAN-13',
  EAN_8: 'EAN-8',
  UPC_A: 'UPC-A',
  UPC_E: 'UPC-E',
  CODE_39: 'Code 39',
  CODE_93: 'Code 93',
  ITF: 'ITF',
  CODABAR: 'Codabar',
  QR_CODE: 'QR code',
  PDF_417: 'PDF417',
  AZTEC: 'Aztec',
  DATA_MATRIX: 'Data Matrix',
};

export const formatLabel = (format: CardFormat) => labels[format];

/** Square (2-D) codes are drawn as a grid and keep their number out of the text under them. */
export const isSquare = (format: CardFormat) =>
  format === 'QR_CODE' || format === 'AZTEC' || format === 'DATA_MATRIX';

/**
 * Types the app can draw. PDF417, Aztec and Data Matrix are kept in the list so a scanned card
 * of that type is recognised, but they need a much larger library (bwip-js, ~13 MB unpacked), so
 * they cannot be drawn yet (see the PR "Size impact").
 */
const undrawable: readonly CardFormat[] = ['PDF_417', 'AZTEC', 'DATA_MATRIX'];
export const isDrawable = (format: CardFormat) => !undrawable.includes(format);
export const drawableFormats = cardFormats.filter(isDrawable);

export function isCardFormat(value: string): value is CardFormat {
  return (cardFormats as readonly string[]).includes(value);
}

/** expo-camera's barcode `type` as a card format; null for an unknown one. */
export function fromScanner(type: string): CardFormat | null {
  switch (type) {
    case 'code128':
      return 'CODE_128';
    case 'code39':
      return 'CODE_39';
    case 'code93':
      return 'CODE_93';
    case 'codabar':
      return 'CODABAR';
    case 'datamatrix':
      return 'DATA_MATRIX';
    case 'ean13':
      return 'EAN_13';
    case 'ean8':
      return 'EAN_8';
    case 'itf14':
      return 'ITF';
    case 'qr':
      return 'QR_CODE';
    case 'upc_a':
      return 'UPC_A';
    case 'upc_e':
      return 'UPC_E';
    case 'pdf417':
      return 'PDF_417';
    case 'aztec':
      return 'AZTEC';
    default:
      return null;
  }
}

/** The scanner types to listen for. */
export const scannerTypes = [
  'code128',
  'code39',
  'code93',
  'codabar',
  'ean13',
  'ean8',
  'itf14',
  'qr',
  'upc_a',
  'upc_e',
  'pdf417',
  'aztec',
  'datamatrix',
] as const;
