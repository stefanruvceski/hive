// The Serbian tax number (PIB), shared by every module that knows businesses (ADR 0004).

/** Digits only, or null when it is not nine digits. Spaces and dashes are ignored. */
export function normalizePib(text: string): string | null {
  const digits = text.replace(/[\s-]/g, '');
  return /^\d{9}$/.test(digits) ? digits : null;
}

/** The PIB check digit (ISO 7064, MOD 11,10) is the ninth digit. */
export function isValidPib(pib: string): boolean {
  if (!/^\d{9}$/.test(pib)) return false;
  let product = 10;
  for (const char of pib.slice(0, 8)) {
    let sum = (Number(char) + product) % 10;
    if (sum === 0) sum = 10;
    product = (2 * sum) % 11;
  }
  return Number(pib[8]) === (11 - product) % 10;
}
