import { render, screen, userEvent } from '@testing-library/react-native';

import { SaveButton } from './save-button';

describe('SaveButton', () => {
  it('is a button named Save that presses', async () => {
    const onPress = jest.fn();
    await render(<SaveButton onPress={onPress} testID="save" />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is announced as disabled and does nothing when disabled', async () => {
    const onPress = jest.fn();
    await render(<SaveButton onPress={onPress} disabled testID="save" />);
    const button = screen.getByTestId('save');
    expect(button).toBeDisabled();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
