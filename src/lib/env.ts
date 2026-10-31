/**
 * Public runtime configuration. Only `EXPO_PUBLIC_*` variables are inlined into the
 * client bundle — never put secrets here. https://docs.expo.dev/guides/environment-variables/
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export const env = {
  apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
} as const;
