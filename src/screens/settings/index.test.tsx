import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { useAppSettings, useSetAppSetting } from '@/hooks/use-app-settings';
import { isApiConfigured } from '@/lib/api';
import { defaultAppSettings } from '@/utils/app-settings';

import { Settings } from './index';

// Mock at the network boundary — the api client, never component internals (agent-rules/09 §5).
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: jest.fn().mockResolvedValue({ status: 'ok', time: '2026-01-01T00:00:00Z' }),
  isApiConfigured: jest.fn(() => true),
}));

// The database boundary: the settings hooks (agent-rules/09 §5).
jest.mock('@/hooks/use-app-settings');
const mutate = jest.fn();

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

// Native boundary: @expo/ui views can't be pressed in Jest. Stand-ins with the same props, so the
// app's own components (SegmentedControl, SettingsRow) run for real (agent-rules/09 §5).
jest.mock('@expo/ui', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    Host: ({ children, colorScheme }: { children: ReactNode; colorScheme?: string }) => (
      <View testID="expo-ui-host" aria-label={`scheme-${colorScheme}`}>
        {children}
      </View>
    ),
    Switch: ({
      value,
      onValueChange,
      label,
      testID,
    }: {
      value: boolean;
      onValueChange: (value: boolean) => void;
      label?: string;
      testID: string;
    }) => (
      <Pressable
        role="switch"
        aria-checked={value}
        testID={testID}
        onPress={() => onValueChange(!value)}>
        {label !== undefined && <Text>{label}</Text>}
      </Pressable>
    ),
  };
});
jest.mock('@expo/ui/swift-ui', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    Host: ({ children, colorScheme }: { children: ReactNode; colorScheme?: string }) => (
      <View testID="expo-ui-host" aria-label={`scheme-${colorScheme}`}>
        {children}
      </View>
    ),
    Text: ({ children }: { children: string }) => <Text>{children}</Text>,
    Picker: ({
      selection,
      onSelectionChange,
      children,
      testID,
    }: {
      selection: string;
      onSelectionChange: (value: string) => void;
      children: { props: { children: string; modifiers: { tag: string }[] } }[];
      testID: string;
    }) => (
      <View testID={testID}>
        {children.map((option) => {
          const value = option.props.modifiers[0]!.tag;
          return (
            <Pressable
              key={value}
              role="radio"
              aria-checked={value === selection}
              testID={`${testID}-${value}`}
              onPress={() => onSelectionChange(value)}>
              <Text>{option.props.children}</Text>
            </Pressable>
          );
        })}
      </View>
    ),
  };
});

// fontScale is what the rows react to; the rest is a plain phone window (copy of key-value-row.test).
const window = (fontScale: number) => ({ width: 402, height: 874, scale: 3, fontScale });
const mockUseWindowDimensions = jest.fn(() => window(1));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

function mockFontScale(fontScale: number) {
  mockUseWindowDimensions.mockReturnValue(window(fontScale));
}

function mockSettings(result: object) {
  jest.mocked(useAppSettings).mockReturnValue(result as never);
}

beforeEach(() => {
  mockFontScale(1);
  mutate.mockReset();
  mockSettings({ data: defaultAppSettings, isPending: false, isError: false });
  jest.mocked(useSetAppSetting).mockReturnValue({ mutate, isError: false } as never);
});

function renderSettings() {
  // Fresh client per test; retries off so failures surface immediately.
  // gcTime: Infinity — no GC timers left running after the test (Jest teardown warning).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Settings />
    </QueryClientProvider>,
  );
}

describe('Settings', () => {
  it('renders the build info and server status', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings-about')).toBeOnTheScreen();
    expect(screen.getByTestId('app-info-card')).toBeOnTheScreen();
    // The row renders immediately as 'checking…'; wait for the query result, not the element.
    await waitFor(() => expect(screen.getByTestId('app-info-server')).toHaveTextContent('ok'));
  });

  it('hides the server row when no API URL is configured', async () => {
    jest.mocked(isApiConfigured).mockReturnValueOnce(false);
    await renderSettings();

    expect(screen.getByTestId('app-info-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('app-info-server')).not.toBeOnTheScreen();
  });
});

describe('Settings preferences', () => {
  // No API URL: the server row (and its async health check) is covered above.
  beforeEach(() => jest.mocked(isApiConfigured).mockReturnValue(false));
  afterEach(() => jest.mocked(isApiConfigured).mockReturnValue(true));

  it('shows every section from the design', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings-title')).toHaveTextContent('Settings');
    for (const id of [
      'settings-home',
      'settings-appearance-group',
      'settings-date-format-group',
      'settings-backup',
      'app-info-card',
    ]) {
      expect(screen.getByTestId(id)).toBeOnTheScreen();
    }
  });

  it('goes back from the Back button', async () => {
    await renderSettings();

    await userEvent.setup().press(screen.getByTestId('settings-back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('saves the chosen appearance', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings-appearance-system')).toBeChecked();
    await userEvent.setup().press(screen.getByTestId('settings-appearance-light'));
    expect(mutate).toHaveBeenCalledWith({ key: 'appearance', value: 'light' });
  });

  it('shows the stored appearance', async () => {
    mockSettings({ data: { ...defaultAppSettings, appearance: 'dark' }, isPending: false });
    await renderSettings();

    expect(screen.getByTestId('settings-appearance-dark')).toBeChecked();
  });

  it('turns Show Today off, with the row label shown once', async () => {
    await renderSettings();

    // The switch must not draw its own label next to the row's (Android renders it as text).
    expect(screen.getAllByText('Show Today')).toHaveLength(1);
    await userEvent.setup().press(screen.getByTestId('settings-show-today'));
    expect(mutate).toHaveBeenCalledWith({ key: 'showToday', value: false });
  });

  it('gives native controls the app scheme, not the phone scheme', async () => {
    await renderSettings();

    // A forced Dark/Light must reach SwiftUI/Compose too; jest-expo reports light.
    const hosts = screen.getAllByTestId('expo-ui-host');
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) expect(host).toHaveProp('aria-label', 'scheme-light');
  });

  it('saves the date format and shows an example in it', async () => {
    mockSettings({ data: { ...defaultAppSettings, dateFormat: 'iso' }, isPending: false });
    await renderSettings();

    expect(screen.getByText(/Dates look like \d{4}-\d{2}-\d{2} in every app/)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('settings-date-format-us'));
    expect(mutate).toHaveBeenCalledWith({ key: 'dateFormat', value: 'us' });
  });

  it('keeps the runtime hash on one line, cut in the middle', async () => {
    await renderSettings();

    expect(screen.getByTestId('app-info-runtime')).toHaveProp('numberOfLines', 1);
    expect(screen.getByTestId('app-info-runtime')).toHaveProp('ellipsizeMode', 'middle');
    expect(screen.getByTestId('app-info-version')).not.toHaveProp('numberOfLines', 1);
    expect(screen.getByTestId('app-info-version')).toHaveStyle({ marginStart: 'auto' });
  });

  it('stacks values under their labels at accessibility text sizes', async () => {
    mockFontScale(2);
    await renderSettings();

    expect(screen.getByTestId('app-info-version')).not.toHaveStyle({ marginStart: 'auto' });
  });

  it('shows Backup as not available yet', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings-backup-now')).toBeDisabled();
    expect(screen.getByTestId('settings-backup-folder')).toHaveTextContent('Not set up');
  });

  it('shows a loading state while settings are read', async () => {
    mockSettings({ data: undefined, isPending: true, isError: false });
    await renderSettings();

    expect(screen.getByTestId('settings-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('app-info-card')).toBeOnTheScreen();
  });

  it('offers a retry when settings cannot be read', async () => {
    const refetch = jest.fn();
    mockSettings({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('db'),
      refetch,
    });
    await renderSettings();

    await userEvent.setup().press(screen.getByTestId('settings-error-retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('says when a change could not be saved', async () => {
    jest.mocked(useSetAppSetting).mockReturnValue({ mutate, isError: true } as never);
    await renderSettings();

    expect(screen.getByTestId('settings-save-error')).toBeOnTheScreen();
  });
});
