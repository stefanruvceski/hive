import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

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
