import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAppSettings, useSetAppSetting } from '@/hooks/use-app-settings';
import { isApiConfigured } from '@/lib/api';
import { replaceFromBackup } from '@/lib/backup/db';
import { defaultAppSettings } from '@/utils/app-settings';

import * as files from './backup-files';
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

// The device boundary: the file system and the database.
jest.mock('./backup-files');
jest.mock('@/lib/backup/db', () => ({
  readAppBackup: jest.fn(() => ({ app: 'hive-backup', version: 1, exportedAt: '', tables: {} })),
  replaceFromBackup: jest.fn(),
}));
const backupText = JSON.stringify({ app: 'hive-backup', version: 1, exportedAt: 'x', tables: {} });

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
  jest.mocked(files.pickBackupFolder).mockReset();
  mockFontScale(1);
  mutate.mockReset();
  mockSettings({ data: defaultAppSettings, isPending: false, isError: false });
  jest.mocked(useSetAppSetting).mockReturnValue({ mutate, isError: false } as never);
});

// Expo Router provides safe areas in the app; tests give a phone-sized frame (copy of the Home test).
const metrics = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, right: 0, bottom: 34, left: 0 },
};

function renderSettings() {
  // Fresh client per test; retries off so failures surface immediately.
  // gcTime: Infinity — no GC timers left running after the test (Jest teardown warning).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={queryClient}>
        <Settings />
      </QueryClientProvider>
    </SafeAreaProvider>,
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

    // The switch is named for screen readers but draws no second label next to the row's.
    expect(screen.getAllByText('Show Today')).toHaveLength(1);
    await userEvent.setup().press(screen.getByRole('switch', { name: 'Show Today' }));
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
    expect(screen.getByTestId('app-info-version')).toHaveStyle({ marginStart: 'auto' });
  });

  it('stacks values under their labels at accessibility text sizes', async () => {
    mockFontScale(2);
    await renderSettings();

    expect(screen.getByTestId('app-info-version')).not.toHaveStyle({ marginStart: 'auto' });
  });

  it('shows that no backup has been made or chosen yet', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings-backup-folder')).toHaveTextContent('Not set up');
    expect(screen.getByTestId('settings-backup-last')).toHaveTextContent('Never');
  });

  it('shows the chosen folder and the last backup in the chosen date format', async () => {
    mockSettings({
      data: {
        ...defaultAppSettings,
        backupFolder: 'file:///Users/me/Backups/',
        lastBackup: new Date(2026, 10, 5, 9, 7).toISOString(),
      },
      isPending: false,
      isError: false,
    });
    await renderSettings();

    expect(screen.getByTestId('settings-backup-folder')).toHaveTextContent('Backups');
    expect(screen.getByTestId('settings-backup-last')).toHaveTextContent('05.11.2026 09:07');
  });

  it('asks for a folder on the first Back Up Now, writes the backup there and notes the time', async () => {
    jest.mocked(files.pickBackupFolder).mockResolvedValue({ uri: 'file:///b/', name: 'b' });
    jest.mocked(files.writeBackupToFolder).mockResolvedValue();
    await renderSettings();

    await userEvent.setup().press(screen.getByTestId('settings-backup-now'));

    expect(mutate).toHaveBeenCalledWith({ key: 'backupFolder', value: 'file:///b/' });
    expect(files.writeBackupToFolder).toHaveBeenCalledWith(
      'file:///b/',
      expect.any(String),
      expect.any(Date),
    );
    expect(mutate).toHaveBeenCalledWith({ key: 'lastBackup', value: expect.any(String) });
    expect(await screen.findByTestId('settings-backup-status')).toHaveTextContent(/Backed up/);
  });

  it('writes to the folder already chosen without asking again', async () => {
    mockSettings({
      data: { ...defaultAppSettings, backupFolder: 'file:///b/' },
      isPending: false,
      isError: false,
    });
    jest.mocked(files.writeBackupToFolder).mockResolvedValue();
    await renderSettings();

    await userEvent.setup().press(screen.getByTestId('settings-backup-now'));

    expect(files.pickBackupFolder).not.toHaveBeenCalled();
    expect(files.writeBackupToFolder).toHaveBeenCalledWith(
      'file:///b/',
      expect.any(String),
      expect.any(Date),
    );
  });

  it('says so when the folder cannot be written to', async () => {
    mockSettings({
      data: { ...defaultAppSettings, backupFolder: 'file:///gone/' },
      isPending: false,
      isError: false,
    });
    jest.mocked(files.writeBackupToFolder).mockRejectedValue(new Error('no access'));
    await renderSettings();

    await userEvent.setup().press(screen.getByTestId('settings-backup-now'));

    expect(await screen.findByTestId('settings-backup-status')).toHaveTextContent(
      /Choose it again/,
    );
    expect(mutate).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'lastBackup' }));
  });

  it('shares a backup through the share sheet', async () => {
    jest.mocked(files.shareBackup).mockResolvedValue();
    await renderSettings();

    await userEvent.setup().press(screen.getByTestId('settings-backup-share'));

    expect(files.shareBackup).toHaveBeenCalledWith(expect.any(String), expect.any(Date));
  });

  it('asks before replacing everything with a file, and refuses a file that is not a backup', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest
      .mocked(files.pickBackupText)
      .mockResolvedValueOnce('nonsense')
      .mockResolvedValueOnce(backupText);
    await renderSettings();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('settings-restore-file'));
    expect(await screen.findByTestId('settings-backup-status')).toHaveTextContent(
      /not a Hive backup/,
    );
    expect(alert).not.toHaveBeenCalled();

    await user.press(screen.getByTestId('settings-restore-file'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Replace everything in Hive?',
        expect.any(String),
        expect.any(Array),
      ),
    );
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    buttons.find((button) => button.text === 'Replace')?.onPress?.();
    expect(replaceFromBackup).toHaveBeenCalled();
  });

  it('needs a folder before it can restore the latest backup', async () => {
    await renderSettings();
    await userEvent.setup().press(screen.getByTestId('settings-restore-latest'));

    expect(await screen.findByTestId('settings-backup-status')).toHaveTextContent(
      /Choose a backup folder/,
    );
  });

  it('asks before restoring the latest backup of the chosen folder', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockSettings({
      data: { ...defaultAppSettings, backupFolder: 'file:///b/' },
      isPending: false,
      isError: false,
    });
    jest.mocked(files.readLatestFromFolder).mockResolvedValue(backupText);
    await renderSettings();

    await userEvent.setup().press(screen.getByTestId('settings-restore-latest'));

    await waitFor(() => expect(alert).toHaveBeenCalled());
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

describe('Settings layout', () => {
  // A SafeAreaView with the bottom edge clipped the scroll view above the home indicator, so the
  // last card was cut off with a hard edge. Content scrolls to the screen edge; the inset is padding.
  it('scrolls to the bottom edge and pads its content past the home indicator', async () => {
    await renderSettings();

    const scroll = screen.getByTestId('settings-scroll');
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({
      paddingBottom: metrics.insets.bottom + Spacing.five,
    });
  });
});
