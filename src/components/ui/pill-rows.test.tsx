import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PillRows } from './pill-rows';

const pills = ['a', 'b', 'c', 'd'].map((key) => ({
  key,
  node: <Text testID={`pill-${key}`}>{key}</Text>,
}));

const land = async (key: string, y: number) =>
  fireEvent(screen.getByTestId(`pill-${key}`).parent!, 'layout', {
    nativeEvent: { layout: { x: 0, y, width: 40, height: 30 } },
  });

describe('PillRows', () => {
  it('lets pills wrap while they fit in two rows', async () => {
    await render(<PillRows pills={pills} />);
    await land('a', 0);
    await land('b', 0);
    await land('c', 38);
    await land('d', 38);

    expect(screen.getAllByTestId(/^pill-[a-d]$/)).toHaveLength(4);
    expect(screen.queryByTestId('pill-rows-scroll')).not.toBeOnTheScreen();
  });

  it('moves to two scrolling rows when a third row would be needed', async () => {
    await render(<PillRows pills={pills} />);
    await land('a', 0);
    await land('b', 38);
    await land('c', 76);

    expect(screen.getByTestId('pill-rows-scroll')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^pill-[a-d]$/)).toHaveLength(4);
  });
});
