import { render, screen, userEvent } from '@testing-library/react-native';

import { HabitColors } from '@/constants/theme';

import { HabitAmount } from './habit-amount';

const color = HabitColors[1].dark;
const renderAmount = (props: { amount?: number; onPress?: () => void }) =>
  render(
    <HabitAmount
      label="Log amount: Water"
      target={8}
      color={color}
      onPress={props.onPress ?? jest.fn()}
      testID="amount"
      amount={props.amount}
    />,
  );

describe('HabitAmount', () => {
  it('shows the amount so far, or a + before any', async () => {
    await renderAmount({});
    expect(screen.getByText('+')).toBeOnTheScreen();
  });

  it('shows a partial amount as a number and opens the sheet on press', async () => {
    const onPress = jest.fn();
    await renderAmount({ amount: 3, onPress });

    expect(screen.getByText('3')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Log amount: Water' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is done at the target: no number, a check instead', async () => {
    await renderAmount({ amount: 8 });

    expect(screen.queryByText('8')).not.toBeOnTheScreen();
    expect(screen.getByTestId('amount-done')).toBeOnTheScreen();
  });
});
