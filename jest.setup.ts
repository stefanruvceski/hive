// @testing-library/react-native v13+ registers its Jest matchers automatically.

// expo-updates has no JS implementation in Jest; expose the fields the app reads.
jest.mock('expo-updates', () => ({
  runtimeVersion: 'test',
  channel: 'test',
  updateId: null,
  isEmbeddedLaunch: true,
}));

// Reanimated 4 / worklets need native modules that do not exist in Jest, and the package's own
// `react-native-reanimated/mock` still loads the real entry (it throws in JSReanimated). This is a
// minimal stand-in for what Customize drag (#48) uses: values are plain objects, animations
// resolve at once, worklets run as ordinary functions. Extend it only when a component needs more.
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
  runOnJS: (fn: unknown) => fn,
}));
jest.mock('react-native-reanimated', () => {
  const { View, ScrollView } = jest.requireActual('react-native');
  const { createElement, forwardRef } = jest.requireActual('react');
  const animated = (Component: unknown) =>
    forwardRef(function Animated(props: object, ref: unknown) {
      return createElement(Component, { ...props, ref });
    });
  return {
    __esModule: true,
    default: {
      View: animated(View),
      ScrollView: animated(ScrollView),
      createAnimatedComponent: (Component: unknown) => Component,
    },
    useSharedValue: (initial: unknown) => {
      const shared = {
        value: initial,
        get: () => shared.value,
        set: (next: unknown) => {
          shared.value = next;
        },
      };
      return shared;
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    useAnimatedRef: () => ({ current: null }),
    useReducedMotion: () => false,
    withTiming: (value: unknown, _config?: unknown, callback?: (done: boolean) => void) => {
      callback?.(true);
      return value;
    },
    withSpring: (value: unknown, _config?: unknown, callback?: (done: boolean) => void) => {
      callback?.(true);
      return value;
    },
    cancelAnimation: () => undefined,
    scrollTo: () => undefined,
    runOnJS: (fn: unknown) => fn,
    Easing: { out: (f: unknown) => f, quad: (t: number) => t, ease: (t: number) => t },
  };
});

// Gesture Handler's detector drives Reanimated internals that Jest cannot run, and nothing in Jest
// can perform a long press and drag anyway: the drag logic is covered by its pure functions
// (drop-target.ts) and by Maestro. These stand-ins keep the tree rendering.
jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: { children: unknown }) => children,
    usePanGesture: () => ({}),
  };
});
