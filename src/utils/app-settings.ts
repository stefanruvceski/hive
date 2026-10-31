// App-wide preferences from Settings and how they are stored: one `settings` row per key, value as
// JSON. Pure, so the parsing rules are tested without a database.

export type Appearance = 'system' | 'dark' | 'light';
export type DateFormat = 'eu' | 'iso' | 'us';

export type AppSettings = {
  appearance: Appearance;
  /** Show the Today section on Home (#33). */
  showToday: boolean;
  /** Stored now; dates follow it once the date-format story lands. */
  dateFormat: DateFormat;
};

export type SettingRow = { key: string; value: string };

/** One changed setting, typed by key. */
export type SettingChange = {
  [K in keyof AppSettings]: { key: K; value: AppSettings[K] };
}[keyof AppSettings];

export const defaultAppSettings: AppSettings = {
  appearance: 'system',
  showToday: true,
  dateFormat: 'eu',
};

export const appearances: readonly Appearance[] = ['system', 'dark', 'light'];
export const dateFormats: readonly DateFormat[] = ['eu', 'iso', 'us'];

const isValid: { [K in keyof AppSettings]: (value: unknown) => value is AppSettings[K] } = {
  appearance: (value): value is Appearance => appearances.includes(value as Appearance),
  showToday: (value): value is boolean => typeof value === 'boolean',
  dateFormat: (value): value is DateFormat => dateFormats.includes(value as DateFormat),
};

function isSettingKey(key: string): key is keyof AppSettings {
  return Object.hasOwn(isValid, key);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Stored rows → settings. Missing, unknown or malformed values fall back to the defaults. */
export function parseAppSettings(rows: readonly SettingRow[]): AppSettings {
  const result: AppSettings = { ...defaultAppSettings };
  for (const row of rows) {
    if (!isSettingKey(row.key)) continue;
    const value = parseJson(row.value);
    if (isValid[row.key](value)) Object.assign(result, { [row.key]: value });
  }
  return result;
}

export function toSettingRow(change: SettingChange): SettingRow {
  return { key: change.key, value: JSON.stringify(change.value) };
}

export function applySettingChange(settings: AppSettings, change: SettingChange): AppSettings {
  return { ...settings, [change.key]: change.value };
}

/** What `Appearance.setColorScheme` expects: `unspecified` follows the phone. */
export function colorSchemeOverride(appearance: Appearance): 'light' | 'dark' | 'unspecified' {
  return appearance === 'system' ? 'unspecified' : appearance;
}

/** A date written the way the format writes it, e.g. 31.10.2026 / 2026-10-31 / 10/31/2026. */
export function formatDateExample(format: DateFormat, date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  if (format === 'iso') return `${year}-${month}-${day}`;
  if (format === 'us') return `${month}/${day}/${year}`;
  return `${day}.${month}.${year}`;
}
