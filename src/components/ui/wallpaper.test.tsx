import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Colors, Effects } from '@/constants/theme';

import { useWallpaperTarget, Wallpaper } from './wallpaper';

function TargetProbe() {
  return <Text testID="probe">{useWallpaperTarget() ? 'target' : 'none'}</Text>;
}

describe('Wallpaper', () => {
  it('paints the theme background behind its children', async () => {
    await render(
      <Wallpaper testID="wallpaper">
        <Text>Content</Text>
      </Wallpaper>,
    );

    expect(screen.getByTestId('wallpaper')).toHaveStyle({
      backgroundColor: Colors.light.background,
    });
    expect(screen.getByText('Content')).toBeOnTheScreen();
  });

  // Android: `backgroundImage` is drawn only by plain RN views, not by expo-blur's BlurTargetView.
  it('draws the glow on a plain view inside the blur target', async () => {
    await render(<Wallpaper />);

    const glow = screen.getByTestId('wallpaper-glow', { includeHiddenElements: true });
    expect(glow.type).toBe('View');
    expect(glow).toHaveStyle({ backgroundImage: Effects.light.wallpaper });
  });

  // Android: glass blurs only what is inside the target. Without the base color there, light glass
  // blurred empty pixels and turned grey.
  it('puts the base color inside the blur target, under the glow', async () => {
    await render(<Wallpaper />);

    const glow = screen.getByTestId('wallpaper-glow', { includeHiddenElements: true });
    expect(glow).toHaveStyle({ backgroundColor: Colors.light.background });
  });

  it('gives glass surfaces inside it a blur target', async () => {
    await render(
      <>
        <Wallpaper>
          <TargetProbe />
        </Wallpaper>
      </>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('target');
  });

  it('has no blur target outside a Wallpaper', async () => {
    await render(<TargetProbe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('none');
  });
});
