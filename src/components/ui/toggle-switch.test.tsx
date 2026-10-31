import { render, screen, userEvent } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';

import { ToggleSwitch } from './toggle-switch';

describe('ToggleSwitch', () => {
  it('is a named switch that shows its state and reports the flipped value', async () => {
    const onValueChange = jest.fn();
    await render(
      <ToggleSwitch value label="Show Today" onValueChange={onValueChange} testID="today" />,
    );

    const toggle = screen.getByRole('switch', { name: 'Show Today' });
    expect(toggle).toBeChecked();
    // On: teal track, as in the design.
    expect(toggle).toHaveStyle({ backgroundColor: Colors.light.accent });

    await userEvent.setup().press(toggle);
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('shows the off track when off', async () => {
    await render(
      <ToggleSwitch value={false} label="Show Today" onValueChange={() => {}} testID="today" />,
    );

    expect(screen.getByRole('switch', { name: 'Show Today' })).not.toBeChecked();
    expect(screen.getByTestId('today')).toHaveStyle({ backgroundColor: Colors.light.switchOff });
  });
});
