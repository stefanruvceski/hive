import { render, screen, userEvent } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';

import { SegmentedControl } from './segmented-control';

// fontScale is what the control reacts to; the rest is a plain phone window.
const window = (fontScale: number) => ({ width: 402, height: 874, scale: 3, fontScale });
const mockUseWindowDimensions = jest.fn(() => window(1));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

const options = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const;

describe('SegmentedControl', () => {
  beforeEach(() => mockUseWindowDimensions.mockReturnValue(window(1)));

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

  it('sits the options side by side at default text sizes', async () => {
    await render(
      <SegmentedControl
        label="Appearance"
        options={options}
        value="system"
        onChange={jest.fn()}
        testID="appearance"
      />,
    );

    expect(screen.getByTestId('appearance')).toHaveStyle({ flexDirection: 'row' });
  });

  // At accessibility sizes four labels side by side break mid-word ("Mo/rni/ng"), as in Habits (#6).
  it('stacks the options at accessibility text sizes, still one choice', async () => {
    mockUseWindowDimensions.mockReturnValue(window(2));
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

    expect(screen.getByTestId('appearance')).toHaveStyle({ flexDirection: 'column' });
    // Stacked segments touch: overlapping hit slop would let a tap pick the neighbour (#42 review).
    expect(screen.getByTestId('appearance-dark').props.hitSlop).toBeUndefined();
    expect(screen.getByTestId('appearance-dark')).toHaveStyle({ minHeight: 48 });
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    await userEvent.setup().press(screen.getByRole('radio', { name: 'Dark' }));
    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
