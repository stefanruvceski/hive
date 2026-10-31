import { render, screen, userEvent } from '@testing-library/react-native';

import { Layout } from '@/constants/theme';

import { GlassButton } from './glass-button';

describe('GlassButton', () => {
  it('is a 44 pt button named by its label', async () => {
    const onPress = jest.fn();
    await render(
      <GlassButton
        icon={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
        label="Settings"
        onPress={onPress}
        testID="open-settings"
      />,
    );

    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button).toHaveStyle({ width: Layout.minTouch, height: Layout.minTouch });

    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
