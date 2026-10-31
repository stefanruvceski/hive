// @testing-library/react-native v13+ registers its Jest matchers automatically.
// src/lib/env.ts throws at import when this is missing; tests must never hit a real URL anyway.
process.env.EXPO_PUBLIC_API_URL ??= 'http://jest.invalid';

// expo-updates has no JS implementation in Jest; expose the fields the app reads.
jest.mock('expo-updates', () => ({
  runtimeVersion: 'test',
  channel: 'test',
  updateId: null,
  isEmbeddedLaunch: true,
}));
