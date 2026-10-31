import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * App variants let the dev, preview and production builds be installed side by side
 * on the same device. Select with APP_VARIANT (set per EAS build profile in eas.json).
 * https://docs.expo.dev/build-reference/variants/
 */
type Variant = 'development' | 'preview' | 'production';

const variant: Variant = (process.env.APP_VARIANT as Variant) ?? 'development';

const config: Record<Variant, { name: string; bundleId: string; scheme: string }> = {
  development: { name: 'Hive (Dev)', bundleId: 'com.ruvceski.hive.dev', scheme: 'hive-dev' },
  preview: {
    name: 'Hive (Preview)',
    bundleId: 'com.ruvceski.hive.preview',
    scheme: 'hive-preview',
  },
  production: { name: 'Hive', bundleId: 'com.ruvceski.hive', scheme: 'hive' },
};

const { name, bundleId, scheme } = config[variant];

// Filled in by `eas init` (or copy from https://expo.dev/accounts/<owner>/projects/hive).
// Not secret — it only identifies the EAS project for builds and updates.
const EAS_PROJECT_ID = '';
const EAS_OWNER = '';

export default ({ config: base }: ConfigContext): ExpoConfig => ({
  ...base,
  name,
  slug: 'hive',
  owner: EAS_OWNER || undefined,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme,
  userInterfaceStyle: 'automatic',
  // Fingerprint-based runtime version: EAS Update only targets builds with identical native code.
  // https://docs.expo.dev/eas-update/runtime-versions/#fingerprint-runtime-version-policy
  runtimeVersion: { policy: 'fingerprint' },
  updates: EAS_PROJECT_ID ? { url: `https://u.expo.dev/${EAS_PROJECT_ID}` } : undefined,
  ios: {
    bundleIdentifier: bundleId,
    // TODO: restore './assets/expo.icon' (Icon Composer file) once it is copied from the original
    // repo; until then iOS falls back to the top-level `icon` PNG so builds don't fail.
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
    variant,
  },
});
