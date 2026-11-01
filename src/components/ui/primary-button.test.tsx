import { render, screen, userEvent } from '@testing-library/react-native';

import { Colors, Layout } from '@/constants/theme';

import { PrimaryButton } from './primary-button';

describe('PrimaryButton', () => {
  it('is an accent-filled button that keeps its text readable', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Try again" onPress={onPress} testID="retry" />);

    const button = screen.getByRole('button', { name: 'Try again' });
    expect(button).toHaveStyle({
      backgroundColor: Colors.light.accent,
      minHeight: Layout.button.height,
    });
    expect(screen.getByText('Try again')).toHaveStyle({ color: Colors.light.onAccent });

    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('comes in a compact size (Done in Customize Home)', async () => {
    await render(<PrimaryButton label="Done" onPress={jest.fn()} size="compact" testID="done" />);

    expect(screen.getByRole('button', { name: 'Done' })).toHaveStyle({
      minHeight: Layout.button.compact.height,
      paddingHorizontal: Layout.button.compact.paddingHorizontal,
    });
  });

  it('can be shown but not usable yet', async () => {
    const onPress = jest.fn();
    await render(
      <PrimaryButton label="Customize Home" onPress={onPress} disabled testID="customize" />,
    );

    const button = screen.getByRole('button', { name: 'Customize Home' });
    expect(button).toBeDisabled();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
