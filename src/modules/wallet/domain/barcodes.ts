import JsBarcode from 'jsbarcode';
import { create } from 'qrcode/lib/core/qrcode';

import { type CardFormat, formatLabel, isDrawable, isSquare } from './card-format';

// Loyalty card barcodes (pure, unit tested): guess the type from a typed number, check it and
// turn it into modules to draw. Ported from hive-poc Barcodes.kt.

const isDigits = (value: string) => /^[0-9]+$/.test(value);

/** The GS1 check digit (EAN-8, EAN-13, UPC-A): weights 3 and 1 from the right, last digit excluded. */
export function validCheck(digits: string): boolean {
  if (digits.length < 2 || !isDigits(digits)) return false;
  const body = [...digits.slice(0, -1)].reverse();
  const sum = body.reduce((acc, c, i) => acc + Number(c) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.slice(-1));
}

/** The usual type for a typed number: EAN-13 / EAN-8 / UPC-A when the check digit fits, else Code 128. */
export function guess(number: string): CardFormat {
  const n = number.trim();
  if (n.length === 13 && validCheck(n)) return 'EAN_13';
  if (n.length === 8 && validCheck(n)) return 'EAN_8';
  if (n.length === 12 && validCheck(n)) return 'UPC_A';
  return 'CODE_128';
}

export type BarcodeModules =
  /** A 1-D code: one char per module, '1' = bar, no quiet zone. */
  | { kind: 'bars'; modules: string }
  /** A 2-D code: `size` x `size` cells, row by row, `true` = dark, no quiet zone. */
  | { kind: 'grid'; size: number; cells: boolean[] };

const barFormat: Partial<Record<CardFormat, string>> = {
  CODE_128: 'CODE128',
  EAN_13: 'EAN13',
  EAN_8: 'EAN8',
  UPC_A: 'UPC',
  UPC_E: 'UPCE',
  CODE_39: 'CODE39',
  CODE_93: 'CODE93',
  ITF: 'ITF',
  CODABAR: 'codabar',
};

/** The modules to draw, or null when `number` cannot be drawn as `format`. */
export function encode(number: string, format: CardFormat): BarcodeModules | null {
  const n =
    format === 'CODE_39' || format === 'CODE_93' ? number.trim().toUpperCase() : number.trim();
  if (n.length === 0 || !isDrawable(format)) return null;
  try {
    if (format === 'QR_CODE') {
      const { size, data } = create(n, { errorCorrectionLevel: 'M' }).modules;
      return { kind: 'grid', size, cells: Array.from(data, (cell) => cell === 1) };
    }
    const jsFormat = barFormat[format];
    if (!jsFormat) return null;
    const target: { encodings?: { data: string }[] } = {};
    JsBarcode(target, n, { format: jsFormat });
    const modules = (target.encodings ?? []).map((e) => e.data).join('');
    // The library pads some types with blank modules for the digits it prints; the screen adds its own margin.
    const trimmed = modules.replace(/^0+|0+$/g, '');
    return trimmed.length > 0 ? { kind: 'bars', modules: trimmed } : null;
  } catch {
    return null;
  }
}

/** Null when `number` can be drawn as `format`, else what is wrong with it. */
export function problem(number: string, format: CardFormat): string | null {
  const n = number.trim();
  if (n.length === 0) return 'Enter the card number';
  const digits = isDigits(n);
  const label = formatLabel(format);
  const own = ((): string | null => {
    switch (format) {
      case 'EAN_13':
        if (!digits || n.length < 12 || n.length > 13) return 'EAN-13 needs 12 or 13 digits';
        return n.length === 13 && !validCheck(n)
          ? "The last digit doesn't check out for EAN-13"
          : null;
      case 'EAN_8':
        if (!digits || n.length < 7 || n.length > 8) return 'EAN-8 needs 7 or 8 digits';
        return n.length === 8 && !validCheck(n)
          ? "The last digit doesn't check out for EAN-8"
          : null;
      case 'UPC_A':
        if (!digits || n.length < 11 || n.length > 12) return 'UPC-A needs 11 or 12 digits';
        return n.length === 12 && !validCheck(n)
          ? "The last digit doesn't check out for UPC-A"
          : null;
      case 'UPC_E':
        return !digits || n.length < 7 || n.length > 8 ? 'UPC-E needs 7 or 8 digits' : null;
      case 'ITF':
        return !digits || n.length % 2 !== 0 ? 'ITF needs an even number of digits' : null;
      case 'CODE_128':
        return [...n].some((c) => c.charCodeAt(0) > 126)
          ? 'Code 128 takes plain letters and digits only'
          : null;
      case 'CODE_39':
      case 'CODE_93':
        return /^[A-Za-z0-9 \-.$/+%]+$/.test(n)
          ? null
          : `${label} takes letters, digits and - . $ / + % only`;
      case 'CODABAR':
        return /^[0-9\-$:/.+ABCDabcd]+$/.test(n)
          ? null
          : 'Codabar takes digits and - $ : / . + only';
      case 'QR_CODE':
      case 'PDF_417':
      case 'AZTEC':
      case 'DATA_MATRIX':
        return null;
    }
  })();
  if (own) return own;
  return encode(n, format) ? null : `This number can't be drawn as ${label}`;
}

/**
 * Whether the code is worth showing as text, so a cashier can type it in when the scan fails:
 * digits (spaces and dashes allowed, up to 24) or a short code of capitals and digits (up to 16).
 * A long random token inside a QR code isn't something anyone reads out, so it stays hidden.
 */
export function readable(number: string): boolean {
  const t = number.trim();
  if (t.length === 0) return false;
  const compact = t.replace(/[ -]/g, '');
  return (
    (compact.length >= 1 && compact.length <= 24 && isDigits(compact)) ||
    (t.length <= 16 && /^[0-9A-Z\- ]+$/.test(t))
  );
}

/** "1234 5678 9012 3" for reading the number aloud at the till; QR contents stay as they are. */
export function spaced(number: string, format: CardFormat): string {
  if (isSquare(format)) return number;
  if (number.length < 8 || /\s/.test(number)) return number;
  return number.match(/.{1,4}/g)?.join(' ') ?? number;
}
