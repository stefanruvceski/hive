import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Layout } from '@/constants/theme';

import { ScreenHeader } from './screen-header';

describe('ScreenHeader', () => {
  it('has Back, a heading with the title, and what is passed as trailing', async () => {
    const onBack = jest.fn();
    await render(
      <ScreenHeader
        title="New habit"
        onBack={onBack}
        backTestID="x-back"
        titleTestID="x-title"
        trailing={<Text>Save</Text>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'New habit' })).toBeOnTheScreen();
    expect(screen.getByText('Save')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('ScreenHeader spacing', () => {
  it('leaves the usual section gap under the header', async () => {
    await render(<ScreenHeader title="T" onBack={() => {}} backTestID="b" titleTestID="t" />);
    const row = screen.getByTestId('t').parent?.parent;
    expect(row).toHaveStyle({ paddingBottom: Layout.sectionGap });
  });
});
