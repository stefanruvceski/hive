import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Colors } from '@/constants/theme';

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
