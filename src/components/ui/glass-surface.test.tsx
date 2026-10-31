import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Colors, Effects } from '@/constants/theme';

import { GlassSurface } from './glass-surface';

describe('GlassSurface', () => {
  // A border or inset highlight under the blur layer is covered by it; it must be drawn on top.
  it('draws the border and top highlight above the blur and the content', async () => {
    await render(
      <GlassSurface kind="glass" radius={30} testID="surface">
        <Text>Inside</Text>
      </GlassSurface>,
    );

    const surface = screen.getByTestId('surface');
    const edge = screen.getByTestId('surface-edge');
    expect(surface.children.at(-1)).toBe(edge);
    expect(edge).toHaveStyle({
      borderColor: Colors.light.glassBorder,
      boxShadow: Effects.light.glassHighlight,
    });
  });

  it('uses the control tokens for controls', async () => {
    await render(<GlassSurface kind="control" radius={22} testID="control" />);

    expect(screen.getByTestId('control-edge')).toHaveStyle({
      borderColor: Colors.light.controlBorder,
      boxShadow: Effects.light.controlHighlight,
    });
  });
});
