import { render, screen } from '@testing-library/react-native';

import { AppTints, Effects, Layout } from '@/constants/theme';

import { AppIcon } from './app-icon';

const icon = { ios: 'heart', android: 'favorite', web: 'favorite' } as const;

describe('AppIcon', () => {
  it('is an image named after the app, bordered in its tint', async () => {
    await render(<AppIcon tint="health" icon={icon} label="Health" testID="icon-health" />);

    expect(screen.getByRole('img', { name: 'Health' })).toBeOnTheScreen();
    expect(screen.getByTestId('icon-health')).toHaveStyle({
      width: Layout.icon.card.size,
      borderRadius: Layout.icon.card.radius,
      borderColor: AppTints.health.light + Effects.light.tileBorderAlpha,
    });
  });

  it('uses the smaller Dock size', async () => {
    await render(
      <AppIcon tint="habits" icon={icon} size="dock" label="Habits" testID="icon-habits" />,
    );

    expect(screen.getByTestId('icon-habits')).toHaveStyle({
      width: Layout.icon.dock.size,
      borderRadius: Layout.icon.dock.radius,
    });
  });
});
