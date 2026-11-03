import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { TodoAdd } from './todo-add';

const renderAdd = async () => {
  const onAdd = jest.fn();
  await render(<TodoAdd onAdd={onAdd} />);
  return onAdd;
};

describe('TodoAdd', () => {
  it('needs a title, and shows the parts of the day only once there is one', async () => {
    await renderAdd();

    expect(screen.getByTestId('habits-todo-add-submit')).toBeDisabled();
    expect(screen.queryByTestId('habits-todo-add-time-morning')).not.toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('habits-todo-add-input'), 'Call');
    expect(screen.getByTestId('habits-todo-add-time-morning')).toBeOnTheScreen();
    expect(screen.getByTestId('habits-todo-add-submit')).toBeEnabled();
  });

  it('adds the title in the chosen part of the day, then clears the field', async () => {
    const onAdd = await renderAdd();
    const user = userEvent.setup();

    await fireEvent.changeText(screen.getByTestId('habits-todo-add-input'), '  Call the dentist ');
    await user.press(screen.getByTestId('habits-todo-add-time-morning'));
    await user.press(screen.getByTestId('habits-todo-add-submit'));

    expect(onAdd).toHaveBeenCalledWith({ title: 'Call the dentist', timeOfDay: 'morning' });
    expect(screen.getByTestId('habits-todo-add-input').props.value).toBe('');
  });

  it('starts in Anytime', async () => {
    const onAdd = await renderAdd();

    await fireEvent.changeText(screen.getByTestId('habits-todo-add-input'), 'Buy milk');
    await userEvent.setup().press(screen.getByTestId('habits-todo-add-submit'));
    expect(onAdd).toHaveBeenCalledWith({ title: 'Buy milk', timeOfDay: 'anytime' });
  });
});
