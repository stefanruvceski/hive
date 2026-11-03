import { render, screen, userEvent } from '@testing-library/react-native';

import { OverdueCard } from './overdue-card';
import type { Todo } from '../../../domain/todos';

const todo = (id: string, extra: Partial<Todo> = {}): Todo => ({
  id,
  title: `Task ${id}`,
  date: '2026-10-30',
  timeOfDay: 'anytime',
  done: false,
  doneAt: null,
  position: 0,
  createdAt: '2026-10-30',
  ...extra,
});

const renderCard = async (todos: Todo[]) => {
  const handlers = { onMoveToToday: jest.fn(), onDone: jest.fn(), onDelete: jest.fn() };
  await render(<OverdueCard todos={todos} {...handlers} />);
  return handlers;
};

describe('OverdueCard', () => {
  it('counts the overdue to-dos and lists them', async () => {
    await renderCard([todo('a'), todo('b')]);

    expect(screen.getByText('Overdue · 2')).toBeOnTheScreen();
    expect(screen.getByText('Task a')).toBeOnTheScreen();
    expect(screen.getByText('Task b')).toBeOnTheScreen();
  });

  it('moves one to today, finishes it, or deletes it', async () => {
    const { onMoveToToday, onDone, onDelete } = await renderCard([todo('a')]);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Move to today: Task a' }));
    expect(onMoveToToday).toHaveBeenCalledWith('a');
    await user.press(screen.getByRole('button', { name: 'Done: Task a' }));
    expect(onDone).toHaveBeenCalledWith('a');
    await user.press(screen.getByRole('button', { name: 'Delete to-do: Task a' }));
    expect(onDelete).toHaveBeenCalledWith('a');
  });

  it('shows nothing without overdue to-dos', async () => {
    await renderCard([]);
    expect(screen.queryByTestId('habits-overdue')).not.toBeOnTheScreen();
  });
});
