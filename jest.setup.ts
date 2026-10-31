// @testing-library/react-native v13+ registers its Jest matchers automatically.

// expo-updates has no JS implementation in Jest; expose the fields the app reads.
jest.mock('expo-updates', () => ({
  runtimeVersion: 'test',
  channel: 'test',
  updateId: null,
  isEmbeddedLaunch: true,
}));
