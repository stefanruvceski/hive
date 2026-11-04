import { encode, guess, problem, readable, spaced, validCheck } from './barcodes';
import { fromScanner } from './card-format';

// Ported from hive-poc wallet/.../domain/BarcodesTest.kt
describe('barcodes', () => {
  it('checks the GS1 check digit', () => {
    expect(validCheck('4006381333931')).toBe(true);
    expect(validCheck('4006381333932')).toBe(false);
    expect(validCheck('96385074')).toBe(true);
    expect(validCheck('036000291452')).toBe(true);
    expect(validCheck('12AB')).toBe(false);
  });

  it('guesses the type', () => {
    expect(guess('4006381333931')).toBe('EAN_13');
    expect(guess('96385074')).toBe('EAN_8');
    expect(guess('036000291452')).toBe('UPC_A');
    expect(guess('4006381333932')).toBe('CODE_128');
    expect(guess('AB-12345')).toBe('CODE_128');
  });

  it('draws barcodes', () => {
    // EAN-13 is 95 modules wide.
    const ean = encode('4006381333931', 'EAN_13');
    expect(ean).toEqual({ kind: 'bars', modules: expect.stringMatching(/^[01]{95}$/) });
    expect(encode('CARD-0042', 'CODE_128')).not.toBeNull();
    const qr = encode('https://example.com/card/42', 'QR_CODE');
    expect(qr).toEqual({ kind: 'grid', size: expect.any(Number), cells: expect.any(Array) });
    const grid = qr as { size: number; cells: boolean[] };
    expect(grid.cells).toHaveLength(grid.size * grid.size);
    expect(encode('12AB', 'EAN_13')).toBeNull();
  });

  it('cannot draw the types that need the large library', () => {
    expect(encode('12345678', 'PDF_417')).toBeNull();
    expect(problem('12345678', 'DATA_MATRIX')).toBe("This number can't be drawn as Data Matrix");
  });

  it('explains problems', () => {
    expect(problem('4006381333931', 'EAN_13')).toBeNull();
    expect(problem('4006381333932', 'EAN_13')).toBe("The last digit doesn't check out for EAN-13");
    expect(problem(' ', 'CODE_128')).toBe('Enter the card number');
    expect(problem('A-12 34', 'CODE_39')).toBeNull();
    expect(problem('123', 'ITF')).toBe('ITF needs an even number of digits');
    expect(problem('12AB', 'EAN_13')).toBe('EAN-13 needs 12 or 13 digits');
    expect(problem('123456789012', 'EAN_13')).toBeNull();
    expect(problem('Čaj', 'CODE_128')).toBe('Code 128 takes plain letters and digits only');
  });

  it('maps scanner formats', () => {
    expect(fromScanner('ean13')).toBe('EAN_13');
    expect(fromScanner('qr')).toBe('QR_CODE');
    expect(fromScanner('nope')).toBeNull();
  });

  it('shows readable numbers only', () => {
    expect(readable('124321254')).toBe(true);
    expect(readable('4006 3812 3456')).toBe(true);
    expect(readable('AB-12345')).toBe(true);
    expect(readable('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.x7Qz')).toBe(false);
    expect(readable('a8F3k2LmQp9xZ7wR')).toBe(false);
    expect(readable('1'.repeat(40))).toBe(false);
    expect(readable('  ')).toBe(false);
  });

  it('groups long numbers in fours', () => {
    expect(spaced('1234567890123', 'EAN_13')).toBe('1234 5678 9012 3');
    expect(spaced('1234', 'EAN_13')).toBe('1234');
    expect(spaced('1234 5678', 'CODE_128')).toBe('1234 5678');
    expect(spaced('https://example.com/card/42', 'QR_CODE')).toBe('https://example.com/card/42');
  });
});
