import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { TodoRow } from './todo-row';
import type { Todo } from '../../../domain/todos';

const todo: Todo = {
  id: 'a',
  title: 'Call the dentist',
  date: '2026-11-03',
  timeOfDay: 'morning',
  done: false,
  doneAt: null,
  position: 0,
  createdAt: '2026-11-03',
};

const renderRow = async (extra: Partial<Todo> = {}) => {
  const handlers = {
    onToggle: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };
  await render(<TodoRow todo={{ ...todo, ...extra }} {...handlers} />);
  return handlers;
};

describe('TodoRow', () => {
  it('shows the title with a checkbox, and toggles it', async () => {
    const { onToggle } = await renderRow();
    const user = userEvent.setup();

    expect(screen.getByText('Call the dentist')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'To-do: Call the dentist' })).not.toBeChecked();
    await user.press(screen.getByTestId('habits-todo-a-check'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('is checked when done, and a press opens it again', async () => {
    const { onToggle } = await renderRow({ done: true });

    expect(screen.getByRole('checkbox', { name: 'To-do: Call the dentist' })).toBeChecked();
    await userEvent.setup().press(screen.getByTestId('habits-todo-a-check'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('offers edit and delete to a screen reader as custom actions', async () => {
    await renderRow();

    expect(screen.getByTestId('habits-todo-text-a').props.accessibilityActions).toEqual([
      { name: 'edit', label: 'Edit' },
      { name: 'delete', label: 'Delete' },
    ]);
  });

  it('runs the custom actions', async () => {
    const { onEdit, onDelete } = await renderRow();
    const text = screen.getByTestId('habits-todo-text-a');

    for (const actionName of ['edit', 'delete']) {
      await fireEvent(text, 'accessibilityAction', { nativeEvent: { actionName } });
    }
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
