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

// Native @expo/ui controls can't be pressed in Jest; stand-ins with the same props.
jest.mock('@expo/ui', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Host: ({ children }: { children: ReactNode }) => children,
    Switch: ({
      value,
      onValueChange,
      testID,
    }: {
      value: boolean;
      onValueChange: (value: boolean) => void;
      testID: string;
    }) => (
      <Pressable
        role="switch"
        aria-checked={value}
        testID={testID}
        onPress={() => onValueChange(!value)}>
        <Text>{value ? 'on' : 'off'}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/ui/segmented-control', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    SegmentedControl: ({
      options,
      value,
      onChange,
      testID,
    }: {
      options: { value: string; label: string }[];
      value: string;
      onChange: (value: string) => void;
      testID: string;
    }) => (
      <View testID={testID}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={option.value === value}
            testID={`${testID}-${option.value}`}
            onPress={() => onChange(option.value)}>
            <Text>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

function mockSettings(result: object) {
  jest.mocked(useAppSettings).mockReturnValue(result as never);
}

beforeEach(() => {
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

  it('turns Show Today off', async () => {
    await renderSettings();

    await userEvent.setup().press(screen.getByTestId('settings-show-today'));
    expect(mutate).toHaveBeenCalledWith({ key: 'showToday', value: false });
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
