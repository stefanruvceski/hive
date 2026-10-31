/**
 * Public runtime configuration. Only `EXPO_PUBLIC_*` variables are inlined into the
 * client bundle — never put secrets here. https://docs.expo.dev/guides/environment-variables/
 *
 * Every value is optional: EAS Update bundles are built without `.env` or `eas.json` env, so a
 * value that throws when missing would crash every OTA update on launch (#18). Features that need
 * a value check for it and degrade (hide the feature, show a clear error) instead.
 */
export function optional(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export const env = {
  /** Base URL for remote integrations. Unset in Hive today — the app is local-first. */
  apiUrl: optional(process.env.EXPO_PUBLIC_API_URL),
} as const;
