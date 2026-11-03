import { render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsBackup } from './index';
import { exportBackupFile, pickBackupText } from '../../data/backup-files';
import { useImportBackup } from '../../data/backup-queries';
import { buildBackup } from '../../domain/backup';

jest.mock('../../data/backup-queries');
// A factory: the real module pulls in native file and sharing modules, which Jest cannot load.
jest.mock('../../data/backup-files', () => ({
  exportBackupFile: jest.fn(),
  pickBackupText: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const importNow = jest.fn((_: unknown, options?: { onSuccess?: () => void }) =>
  options?.onSuccess?.(),
);
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsBackup />
    </SafeAreaProvider>,
  );
const goodFile = JSON.stringify(
  buildBackup({ habits: [], completions: [], todos: [], mood: [], reminders: [] }, new Date()),
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useImportBackup).mockReturnValue({ mutate: importNow, isPending: false } as never);
});

describe('HabitsBackup', () => {
  it('exports through the share sheet', async () => {
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('habits-backup-export'));

    expect(exportBackupFile).toHaveBeenCalledTimes(1);
  });

  it('says so when the export fails', async () => {
    jest.mocked(exportBackupFile).mockRejectedValueOnce(new Error('no'));
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('habits-backup-export'));

    expect(await screen.findByTestId('habits-backup-status')).toHaveTextContent(/Couldn't export/);
  });

  it('asks before replacing, then imports a valid file', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(pickBackupText).mockResolvedValue(goodFile);
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('habits-backup-import'));

    expect(importNow).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]?.[2];
    buttons?.find((button) => button.text === 'Replace')?.onPress?.();
    expect(importNow).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('habits-backup-status')).toHaveTextContent(/Imported/);
  });

  it('refuses a file that is not a backup, and changes nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(pickBackupText).mockResolvedValue('{"hello":1}');
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('habits-backup-import'));

    expect(await screen.findByTestId('habits-backup-status')).toHaveTextContent(
      /not a Hive backup/,
    );
    expect(alert).not.toHaveBeenCalled();
    expect(importNow).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is cancelled', async () => {
    jest.mocked(pickBackupText).mockResolvedValue(null);
    await renderScreen();
    await userEvent.setup().press(screen.getByTestId('habits-backup-import'));

    expect(screen.queryByTestId('habits-backup-status')).not.toBeOnTheScreen();
    expect(importNow).not.toHaveBeenCalled();
  });
});
