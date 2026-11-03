import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsHome } from './index';
import {
  type Habit,
  useArchivedHabits,
  useArchiveHabit,
  useCompletions,
  useHabits,
  useSetAmount,
  useSetCompletion,
} from '../../data/queries';
import { useReorder } from '../../data/reorder-queries';
import {
  useAddTodo,
  useDeleteTodo,
  useMoveTodo,
  useToggleTodo,
  useTodos,
  useUpdateTodo,
} from '../../data/todo-queries';
import type { Todo } from '../../domain/todos';

jest.mock('../../data/queries');
jest.mock('../../data/reorder-queries');
jest.mock('../../data/todo-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Tuesday 3 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-03' }));

// Long-press-and-drag itself is a gesture Jest cannot perform: where a drop lands is tested in
// domain/reorder.test.ts. Here: the list's order, and the screen-reader way to move a row.
const reorder = jest.fn();

const habit = (id: string, timeOfDay: Habit['timeOfDay'], position: number) =>
  ({
    id,
    name: id,
    emoji: '🎯',
    timeOfDay,
    position,
    createdAt: '2026-10-01',
    scheduleType: 'daily',
    scheduleDays: null,
    scheduleTimes: null,
    unit: null,
    target: null,
    quit: false,
  }) as Habit;

const todo = (id: string, timeOfDay: Todo['timeOfDay'], position: number): Todo => ({
  id,
  title: `Task ${id}`,
  date: '2026-11-03',
  timeOfDay,
  done: false,
  doneAt: null,
  position,
  createdAt: '2026-11-03',
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useHabits).mockReturnValue({
    data: [habit('a', 'morning', 0), habit('b', 'morning', 3), habit('c', 'evening', 4)],
  } as never);
  jest.mocked(useTodos).mockReturnValue({ data: [todo('t', 'morning', 1)] } as never);
  jest.mocked(useCompletions).mockReturnValue({ data: [] } as never);
  jest.mocked(useArchivedHabits).mockReturnValue({ data: [] } as never);
  for (const hook of [
    useAddTodo,
    useToggleTodo,
    useDeleteTodo,
    useMoveTodo,
    useUpdateTodo,
    useSetCompletion,
    useSetAmount,
    useArchiveHabit,
  ]) {
    jest.mocked(hook).mockReturnValue({ mutate: jest.fn() } as never);
  }
  jest.mocked(useReorder).mockReturnValue({ mutate: reorder } as never);
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderHabits = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsHome />
    </SafeAreaProvider>,
  );
const act = (testID: string, actionName: string) =>
  fireEvent(screen.getByTestId(testID), 'accessibilityAction', { nativeEvent: { actionName } });

describe('HabitsHome list order', () => {
  it('has no reorder button any more: rows are dragged', async () => {
    await renderHabits();
    expect(screen.queryByTestId('habits-reorder-toggle')).toBeNull();
  });

  it('mixes habits and to-dos in one list by position, not habits first', async () => {
    await renderHabits();
    const morning = within(screen.getByTestId('habits-section-morning'));
    const order = morning
      .getAllByTestId(/^habits-(item|todo)-[a-z]$/)
      .map((row) => row.props.testID);
    expect(order).toEqual(['habits-item-a', 'habits-todo-t', 'habits-item-b']);
  });

  it('moves a to-do up past a habit for a screen reader, and saves the new order', async () => {
    await renderHabits();
    await act('habits-todo-text-t', 'moveUp');

    expect(reorder).toHaveBeenCalledWith(
      [
        { kind: 'todo', id: 't', position: 0, timeOfDay: 'morning' },
        { kind: 'habit', id: 'a', position: 1, timeOfDay: 'morning' },
        // The gap in the stored positions closes: the whole list is numbered 0, 1, 2…
        { kind: 'habit', id: 'b', position: 2, timeOfDay: 'morning' },
        { kind: 'habit', id: 'c', position: 3, timeOfDay: 'evening' },
      ],
      expect.anything(),
    );
  });

  it('moves the last row of a part into the next part, at its top', async () => {
    await renderHabits();
    await act('habits-item-text-b', 'moveDown');

    expect(reorder).toHaveBeenCalledWith(
      [
        { kind: 'habit', id: 'b', position: 2, timeOfDay: 'evening' },
        { kind: 'habit', id: 'c', position: 3, timeOfDay: 'evening' },
      ],
      expect.anything(),
    );
  });

  it('offers no move past the ends of the list', async () => {
    await renderHabits();
    const first = screen.getByTestId('habits-item-text-a').props.accessibilityActions;
    const last = screen.getByTestId('habits-item-text-c').props.accessibilityActions;

    expect(first.map((a: { name: string }) => a.name)).not.toContain('moveUp');
    expect(first.map((a: { name: string }) => a.name)).toContain('moveDown');
    expect(last.map((a: { name: string }) => a.name)).not.toContain('moveDown');
  });

  it('offers a retry when the new order cannot be saved', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    reorder.mockImplementation((_changes, options) => options.onError());
    await renderHabits();
    await act('habits-todo-text-t', 'moveUp');

    expect(alert).toHaveBeenCalledWith("Couldn't save", expect.any(String), expect.any(Array));
  });
});
