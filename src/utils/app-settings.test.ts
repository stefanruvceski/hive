import {
  applySettingChange,
  colorSchemeOverride,
  defaultAppSettings,
  formatDateExample,
  parseAppSettings,
  toSettingRow,
} from './app-settings';

describe('parseAppSettings', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(parseAppSettings([])).toEqual(defaultAppSettings);
  });

  it('reads stored values', () => {
    const rows = [
      toSettingRow({ key: 'appearance', value: 'dark' }),
      toSettingRow({ key: 'showToday', value: false }),
      toSettingRow({ key: 'dateFormat', value: 'iso' }),
    ];
    expect(parseAppSettings(rows)).toEqual({
      appearance: 'dark',
      showToday: false,
      dateFormat: 'iso',
    });
  });

  it('ignores unknown keys and keeps the default for malformed or invalid values', () => {
    const rows = [
      { key: 'appearance', value: '"sepia"' },
      { key: 'showToday', value: 'not json' },
      { key: 'dateFormat', value: '42' },
      { key: 'somethingElse', value: '"x"' },
      { key: 'toString', value: '"x"' },
    ];
    expect(parseAppSettings(rows)).toEqual(defaultAppSettings);
  });
});

describe('applySettingChange', () => {
  it('changes only the given setting', () => {
    expect(applySettingChange(defaultAppSettings, { key: 'appearance', value: 'light' })).toEqual({
      ...defaultAppSettings,
      appearance: 'light',
    });
  });
});

describe('colorSchemeOverride', () => {
  it('follows the phone for System and forces Dark or Light', () => {
    expect(colorSchemeOverride('system')).toBe('unspecified');
    expect(colorSchemeOverride('dark')).toBe('dark');
    expect(colorSchemeOverride('light')).toBe('light');
  });
});

describe('formatDateExample', () => {
  const date = new Date(2026, 9, 31);

  it('writes the date in each format', () => {
    expect(formatDateExample('eu', date)).toBe('31.10.2026');
    expect(formatDateExample('iso', date)).toBe('2026-10-31');
    expect(formatDateExample('us', date)).toBe('10/31/2026');
  });

  it('pads single-digit days and months', () => {
    expect(formatDateExample('eu', new Date(2027, 0, 5))).toBe('05.01.2027');
  });
});
