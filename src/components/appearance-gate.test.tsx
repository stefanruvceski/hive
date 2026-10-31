import { render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Appearance, Text } from 'react-native';

import { useAppSettings } from '@/hooks/use-app-settings';
import { defaultAppSettings } from '@/utils/app-settings';

import { AppearanceGate } from './appearance-gate';

// The database boundary (docs/agent-rules/09 §5).
jest.mock('@/hooks/use-app-settings');
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(() => Promise.resolve()) }));

const setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});

function mockSettings(result: object) {
  jest.mocked(useAppSettings).mockReturnValue(result as never);
}

beforeEach(() => {
  setColorScheme.mockClear();
  jest.mocked(SplashScreen.hideAsync).mockClear();
});

describe('AppearanceGate', () => {
  it('holds the app and the splash while the setting is read', async () => {
    mockSettings({ isPending: true, data: undefined });
    await render(
      <AppearanceGate>
        <Text>App</Text>
      </AppearanceGate>,
    );

    expect(screen.queryByText('App')).not.toBeOnTheScreen();
    expect(setColorScheme).not.toHaveBeenCalled();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('applies the saved appearance, then shows the app', async () => {
    mockSettings({ isPending: false, data: { ...defaultAppSettings, appearance: 'light' } });
    await render(
      <AppearanceGate>
        <Text>App</Text>
      </AppearanceGate>,
    );

    expect(screen.getByText('App')).toBeOnTheScreen();
    expect(setColorScheme).toHaveBeenCalledWith('light');
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('follows the phone when the setting cannot be read', async () => {
    mockSettings({ isPending: false, isError: true, data: undefined });
    await render(
      <AppearanceGate>
        <Text>App</Text>
      </AppearanceGate>,
    );

    expect(screen.getByText('App')).toBeOnTheScreen();
    expect(setColorScheme).toHaveBeenCalledWith('unspecified');
  });
});
