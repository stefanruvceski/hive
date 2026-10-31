import { render, screen } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';

import { SectionLabel } from './section-label';

describe('SectionLabel', () => {
  it('announces a section title as a heading', async () => {
    await render(<SectionLabel testID="today-title">Today</SectionLabel>);

    expect(screen.getByRole('heading', { name: 'Today' })).toBeOnTheScreen();
  });

  it('renders a group name in the quaternary text color', async () => {
    await render(
      <SectionLabel variant="group" testID="group-name">
        Body & mind
      </SectionLabel>,
    );

    expect(screen.getByTestId('group-name')).toHaveStyle({ color: Colors.light.textQuaternary });
    expect(screen.queryByRole('heading')).not.toBeOnTheScreen();
  });

  it('wraps instead of truncating', async () => {
    await render(
      <SectionLabel variant="group" testID="group-name">
        {'A very long group name '.repeat(4)}
      </SectionLabel>,
    );

    expect(screen.getByTestId('group-name')).not.toHaveProp('numberOfLines');
    expect(screen.getByTestId('group-name')).toHaveStyle({ flexShrink: 1 });
  });
});
