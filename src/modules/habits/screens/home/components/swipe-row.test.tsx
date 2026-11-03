import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SwipeRow } from './swipe-row';
import type { SwipeSide } from '../../../domain/swipe';

// The swipe itself is a gesture Jest cannot perform: its release rules are tested in
// domain/swipe.test.ts and the whole flow by Maestro. Here: what the open row offers.
const onOpenChange = jest.fn();
const onEdit = jest.fn();
const onArchive = jest.fn();

const renderRow = (open: SwipeSide | null) =>
  render(
    <SwipeRow
      open={open}
      onOpenChange={onOpenChange}
      onEdit={onEdit}
      onArchive={onArchive}
      enabled
      name="Run"
      testID="swipe">
      <Text>Run</Text>
    </SwipeRow>,
  );

beforeEach(() => jest.clearAllMocks());

describe('SwipeRow', () => {
  it('hides its buttons from screen readers while closed', async () => {
    await renderRow(null);
    expect(screen.queryByTestId('swipe-archive')).toBeNull();
    expect(screen.queryByTestId('swipe-close')).toBeNull();
  });

  it('shows only Archive when opened towards the trailing edge', async () => {
    await renderRow('trailing');
    const user = userEvent.setup();

    expect(screen.queryByRole('button', { name: 'Edit Run' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Archive Run' }));

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(null);
  });

  it('shows Edit when opened towards the leading edge', async () => {
    await renderRow('leading');
    const user = userEvent.setup();

    await user.press(screen.getByTestId('swipe-edit'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(null);
  });

  it('closes when the open row is tapped', async () => {
    await renderRow('trailing');
    const user = userEvent.setup();

    await user.press(screen.getByTestId('swipe-close'));

    expect(onOpenChange).toHaveBeenCalledWith(null);
    expect(onArchive).not.toHaveBeenCalled();
  });
});
