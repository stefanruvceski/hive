import { render, screen, userEvent } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';

import { SegmentedControl } from './segmented-control';

const options = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const;

describe('SegmentedControl', () => {
  it('is a radio group that marks the chosen option and reports a new choice', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        label="Appearance"
        options={options}
        value="system"
        onChange={onChange}
        testID="appearance"
      />,
    );

    // The group isn't one accessible element (that would hide the segments on iOS), so check it by id.
    expect(screen.getByTestId('appearance')).toHaveProp('role', 'radiogroup');
    expect(screen.getByTestId('appearance')).toHaveProp('aria-label', 'Appearance');
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();
    // Selected option: teal pill and teal text, as in the design.
    expect(screen.getByTestId('appearance-system')).toHaveStyle({
      backgroundColor: Colors.light.segmentSelected,
    });
    expect(screen.getByText('System')).toHaveStyle({ color: Colors.light.accentText });

    await userEvent.setup().press(screen.getByRole('radio', { name: 'Light' }));
    expect(onChange).toHaveBeenCalledWith('light');
  });
});
