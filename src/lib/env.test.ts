import { optional } from './env';

// Regression for #18: EAS Update bundles are built without `.env` or `eas.json` env, so a missing
// EXPO_PUBLIC_* variable must read as "not configured" — never throw, or every OTA update crashes.
describe('optional', () => {
  it('returns undefined for a missing or blank value', () => {
    expect(optional(undefined)).toBeUndefined();
    expect(optional('')).toBeUndefined();
    expect(optional('   ')).toBeUndefined();
  });

  it('returns the trimmed value when set', () => {
    expect(optional(' https://api.example.com ')).toBe('https://api.example.com');
  });
});
