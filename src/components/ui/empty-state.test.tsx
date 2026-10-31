import { render, screen } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('uses the empty-state type from the design (Empty.dc.html), not the screen title', async () => {
    await render(
      <EmptyState title="No modules yet" description="Modules show up here." testID="x-empty" />,
    );

    expect(screen.getByRole('heading', { name: 'No modules yet' })).toHaveStyle({
      fontSize: 22,
      lineHeight: 28,
      fontWeight: 700,
    });
    expect(screen.getByText('Modules show up here.')).toHaveStyle({
      fontSize: 15,
      lineHeight: 21,
      color: Colors.light.textTertiary,
    });
  });

  // At the largest text sizes the copy is taller than the screen; it must scroll, not be cut off.
  it('scrolls when its content is taller than the screen', async () => {
    await render(<EmptyState title="No modules yet" testID="x-empty" />);

    expect(screen.getByTestId('x-empty').type).toBe('RCTScrollView');
  });
});
