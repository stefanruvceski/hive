import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Colors, Layout } from '@/constants/theme';

import { GlassCard } from './glass-card';

describe('GlassCard', () => {
  it('renders its content on a card-radius glass surface', async () => {
    await render(
      <GlassCard testID="card">
        <Text>Inside</Text>
      </GlassCard>,
    );

    expect(screen.getByText('Inside')).toBeOnTheScreen();
    expect(screen.getByTestId('card')).toHaveStyle({
      borderRadius: Layout.radius.card,
      padding: Layout.cardPadding,
    });
    // The border and highlight sit on a layer above the blur (see glass-surface.test.tsx).
    expect(screen.getByTestId('card-edge')).toHaveStyle({ borderColor: Colors.light.glassBorder });
  });

  it('uses the sheet radius for sheets', async () => {
    await render(<GlassCard variant="sheet" testID="sheet" />);

    expect(screen.getByTestId('sheet')).toHaveStyle({ borderRadius: Layout.radius.sheet });
  });
});
