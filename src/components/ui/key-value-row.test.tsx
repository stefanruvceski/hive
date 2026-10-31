import { render, screen } from '@testing-library/react-native';

import { KeyValueRow } from './key-value-row';

// fontScale is what the row reacts to; the rest is a plain phone window.
const window = (fontScale: number) => ({ width: 402, height: 874, scale: 3, fontScale });
const mockUseWindowDimensions = jest.fn(() => window(1));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

const hash = 'c6048d64715f545512165c631d6ec2842e66d8df';

describe('KeyValueRow', () => {
  beforeEach(() => mockUseWindowDimensions.mockReturnValue(window(1)));

  it('renders the label and the value', async () => {
    await render(<KeyValueRow label="Runtime" value={hash} testID="runtime" />);

    expect(screen.getByText('Runtime')).toBeOnTheScreen();
    expect(screen.getByTestId('runtime')).toHaveTextContent(hash);
  });

  it('keeps the label width and lets a long value shrink and wrap', async () => {
    await render(<KeyValueRow label="Runtime" value={hash} testID="runtime" />);

    expect(screen.getByText('Runtime')).toHaveStyle({ flexShrink: 0 });
    const value = screen.getByTestId('runtime');
    expect(value).toHaveStyle({ flexShrink: 1 });
    // Wrap, never truncate (agent-rules/12 §3).
    expect(value.props.numberOfLines).toBeUndefined();
  });

  it('lays out side by side at default text size', async () => {
    await render(<KeyValueRow label="Runtime" value={hash} testID="runtime" />);

    expect(screen.getByTestId('runtime-row')).toHaveStyle({ flexDirection: 'row' });
  });

  it('stacks the value under the label at accessibility text sizes', async () => {
    mockUseWindowDimensions.mockReturnValue(window(2));
    await render(<KeyValueRow label="Runtime" value={hash} testID="runtime" />);

    expect(screen.getByTestId('runtime-row')).toHaveStyle({ flexDirection: 'column' });
    expect(screen.getByTestId('runtime')).toHaveStyle({ textAlign: 'left' });
  });
});
