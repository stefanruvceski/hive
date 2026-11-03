import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { AmountSheet } from './amount-sheet';

const base = { visible: true, title: 'Water', unit: 'glasses', target: 8 };
const renderSheet = async (props: { amount?: number } = {}) => {
  const handlers = { onSave: jest.fn(), onClear: jest.fn(), onClose: jest.fn() };
  await render(<AmountSheet {...base} {...handlers} {...props} />);
  return handlers;
};

describe('AmountSheet', () => {
  it('shows the habit, the target and the amount so far', async () => {
    await renderSheet({ amount: 3 });

    expect(screen.getByText('Water')).toBeOnTheScreen();
    expect(screen.getByText('Target: 8 glasses')).toBeOnTheScreen();
    expect(screen.getByTestId('habits-amount-input').props.value).toBe('3');
  });

  it('steps with + and −, never below zero, and saves', async () => {
    const { onSave } = await renderSheet({ amount: 0.5 });
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-amount-plus'));
    expect(screen.getByTestId('habits-amount-input').props.value).toBe('1.5');
    await user.press(screen.getByTestId('habits-amount-minus'));
    await user.press(screen.getByTestId('habits-amount-minus'));
    await user.press(screen.getByTestId('habits-amount-minus'));
    expect(screen.getByTestId('habits-amount-input').props.value).toBe('0');
    await user.press(screen.getByTestId('habits-amount-plus'));
    await user.press(screen.getByTestId('habits-amount-save'));
    expect(onSave).toHaveBeenCalledWith(1);
  });

  it('takes a typed number, with a comma as the decimal, and needs one to save', async () => {
    const { onSave } = await renderSheet();
    const user = userEvent.setup();

    expect(screen.getByTestId('habits-amount-save')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('habits-amount-input'), '2,5');
    await user.press(screen.getByTestId('habits-amount-save'));
    expect(onSave).toHaveBeenCalledWith(2.5);
  });

  it('clears a logged amount, and offers it only when there is one', async () => {
    const { onClear } = await renderSheet({ amount: 4 });

    await userEvent.setup().press(screen.getByTestId('habits-amount-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('has no Clear without an amount, and closes on Cancel', async () => {
    const { onClose } = await renderSheet();

    expect(screen.queryByTestId('habits-amount-clear')).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('habits-amount-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
