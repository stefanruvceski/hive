import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WalletCardNew } from './index';
import { useCreateCard } from '../../data/queries';

jest.mock('../../data/queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const mockPermission = jest.fn();
const mockScan = jest.fn(() => ({ type: 'ean13', data: '4006381333931' }));
jest.mock('expo-camera', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useCameraPermissions: () => mockPermission(),
    CameraView: ({ onBarcodeScanned }: { onBarcodeScanned: (r: object) => void }) => (
      <Pressable testID="fake-camera" onPress={() => onBarcodeScanned(mockScan())} />
    ),
  };
});

const mutate = jest.fn();
const frame = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={frame}>
      <WalletCardNew />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockScan.mockReturnValue({ type: 'ean13', data: '4006381333931' });
  mockPermission.mockReturnValue([{ granted: true, canAskAgain: true }, jest.fn()]);
  jest.mocked(useCreateCard).mockReturnValue({ mutate, isPending: false } as never);
});

describe('WalletCardNew', () => {
  it('guesses EAN-13 from a typed number and saves the named card', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('wallet-scanner-close'));

    await user.type(screen.getByTestId('wallet-card-number'), '4006381333931');
    expect(screen.getByTestId('wallet-card-format-EAN_13')).toBeChecked();
    expect(screen.queryByTestId('wallet-card-problem')).not.toBeOnTheScreen();

    await user.type(screen.getByTestId('wallet-card-name'), 'Maxi');
    await user.press(screen.getByTestId('wallet-card-color-rose'));
    await user.press(screen.getByTestId('wallet-card-save'));

    expect(mutate).toHaveBeenCalledWith(
      { name: 'Maxi', number: '4006381333931', format: 'EAN_13', color: 'rose', note: '' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('suggests a known program while typing and fills in its name', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('wallet-scanner-close'));

    await user.type(screen.getByTestId('wallet-card-name'), 'ide');
    await user.press(screen.getByTestId('wallet-card-suggestion-Idea'));

    expect(screen.getByTestId('wallet-card-name').props.value).toBe('Idea');
    expect(screen.queryByTestId('wallet-card-suggestion-Idea')).not.toBeOnTheScreen();
  });

  it('saves a non-numeric number as Code 128', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('wallet-scanner-close'));

    await user.type(screen.getByTestId('wallet-card-number'), 'AB-12345');
    await user.type(screen.getByTestId('wallet-card-name'), 'Gym');
    await user.press(screen.getByTestId('wallet-card-save'));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'CODE_128', number: 'AB-12345' }),
      expect.anything(),
    );
  });

  it('says what is wrong with a number for the chosen type, and does not save it', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('wallet-scanner-close'));

    await user.type(screen.getByTestId('wallet-card-number'), '4006381333932');
    await user.press(screen.getByTestId('wallet-card-format-EAN_13'));
    await user.type(screen.getByTestId('wallet-card-name'), 'Maxi');

    expect(screen.getByTestId('wallet-card-problem')).toHaveTextContent(
      "The last digit doesn't check out for EAN-13",
    );
    await user.press(screen.getByTestId('wallet-card-save'));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('starts with only the scan button; typing it in brings the fields', async () => {
    await renderScreen();

    expect(screen.queryByTestId('wallet-card-number')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-card-name')).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('wallet-scanner-close'));
    expect(screen.getByTestId('wallet-card-number')).toBeOnTheScreen();
    expect(screen.getByTestId('wallet-card-name')).toBeOnTheScreen();
  });

  it('fills the number and type from a scan and asks only for the name and color', async () => {
    await renderScreen();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('fake-camera'));

    expect(screen.queryByTestId('wallet-scanner')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-card-number')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-card-format-EAN_13')).not.toBeOnTheScreen();
    expect(screen.getByTestId('wallet-card-name')).toBeOnTheScreen();
    expect(screen.getByTestId('wallet-card-color-rose')).toBeOnTheScreen();

    await user.type(screen.getByTestId('wallet-card-name'), 'Gym');
    await user.press(screen.getByTestId('wallet-card-save'));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ number: '4006381333931', format: 'EAN_13', name: 'Gym' }),
      expect.anything(),
    );
  });

  it('keeps typing possible and offers Settings when the camera is denied', async () => {
    mockPermission.mockReturnValue([{ granted: false, canAskAgain: false }, jest.fn()]);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderScreen();
    const user = userEvent.setup();

    expect(screen.getByTestId('wallet-scanner-denied')).toBeOnTheScreen();
    await user.press(screen.getByTestId('wallet-scanner-settings'));
    expect(openSettings).toHaveBeenCalled();

    await user.press(screen.getByTestId('wallet-scanner-close'));
    expect(screen.getByTestId('wallet-card-number')).toBeOnTheScreen();
    await user.type(screen.getByTestId('wallet-card-number'), '123');
    expect(screen.getByTestId('wallet-card-number')).toHaveDisplayValue('123');
  });

  it('goes back after saving', async () => {
    mutate.mockImplementation((_draft: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    );
    await renderScreen();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('wallet-scanner-close'));
    await user.type(screen.getByTestId('wallet-card-number'), 'AB-1');
    await user.type(screen.getByTestId('wallet-card-name'), 'Gym');
    await user.press(screen.getByTestId('wallet-card-save'));

    expect(router.back).toHaveBeenCalled();
  });

  it('asks for nothing when the scan names a known program, and saves it as scanned', async () => {
    mockScan.mockReturnValue({ type: 'qr', data: 'https://www.lidl.rs/plus?c=3e3c9a' });
    await renderScreen();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('fake-camera'));

    for (const hidden of [
      'wallet-card-name',
      'wallet-card-number',
      'wallet-card-format-QR_CODE',
      'wallet-card-color-rose',
    ]) {
      expect(screen.queryByTestId(hidden)).not.toBeOnTheScreen();
    }
    expect(screen.getByTestId('wallet-card-recognised')).toBeOnTheScreen();
    await user.press(screen.getByTestId('wallet-card-save'));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Lidl Plus', format: 'QR_CODE' }),
      expect.anything(),
    );
  });

  it('leaves the name and color alone for a code that is not a known program', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('fake-camera'));

    expect(screen.getByTestId('wallet-card-name')).toHaveProp('value', '');
    expect(screen.queryByTestId('wallet-card-recognised')).not.toBeOnTheScreen();
    expect(screen.getByTestId('wallet-card-color-rose')).toBeEnabled();
  });

  it('wraps the type and color chips instead of scrolling them sideways', async () => {
    await renderScreen();
    expect(screen.queryByTestId('wallet-card-format-scroll')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('wallet-card-color-scroll')).not.toBeOnTheScreen();
  });
});
