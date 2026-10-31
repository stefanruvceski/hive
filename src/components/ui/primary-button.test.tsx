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
});
