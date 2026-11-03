import { render, screen, userEvent, within, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsHome } from './index';
import {
  type Habit,
  useArchivedHabits,
  useCompletions,
  useHabits,
  useMoveHabit,
  useSetAmount,
  useSetCompletion,
} from '../../data/queries';
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
jest.mock('../../data/todo-queries');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Tuesday 3 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-03' }));

const mutate = {
  add: jest.fn(),
  toggle: jest.fn(),
  remove: jest.fn(),
  move: jest.fn(),
  update: jest.fn(),
};

const habit = (id: string, timeOfDay: Habit['timeOfDay'] = 'morning') =>
  ({
    id,
    name: id,
    emoji: '🎯',
    timeOfDay,
    position: 0,
    createdAt: '2026-10-01',
    scheduleType: 'daily',
    scheduleDays: null,
    scheduleTimes: null,
    unit: null,
    target: null,
    quit: false,
  }) as Habit;

const todo = (id: string, extra: Partial<Todo> = {}): Todo => ({
  id,
  title: `Task ${id}`,
  date: '2026-11-03',
  timeOfDay: 'anytime',
  done: false,
  doneAt: null,
  position: 0,
  createdAt: '2026-11-03',
  ...extra,
});

const show = (todos: Todo[], habits: Habit[] = [habit('run')]) => {
  jest.mocked(useHabits).mockReturnValue({ data: habits } as never);
  jest.mocked(useTodos).mockReturnValue({ data: todos } as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useCompletions).mockReturnValue({ data: [], refetch: jest.fn() } as never);
  jest.mocked(useSetCompletion).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useSetAmount).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useMoveHabit).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useArchivedHabits).mockReturnValue({ data: [] } as never);
  jest.mocked(useAddTodo).mockReturnValue({ mutate: mutate.add } as never);
  jest.mocked(useToggleTodo).mockReturnValue({ mutate: mutate.toggle } as never);
  jest.mocked(useDeleteTodo).mockReturnValue({ mutate: mutate.remove } as never);
  jest.mocked(useMoveTodo).mockReturnValue({ mutate: mutate.move } as never);
  jest.mocked(useUpdateTodo).mockReturnValue({ mutate: mutate.update } as never);
});

afterEach(() => jest.restoreAllMocks());

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

describe('HabitsHome parts of the day against the clock', () => {
  const at = (hour: number) => jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);

  it('marks the current part "Now" and an earlier part with open things "Earlier"', async () => {
    at(15);
    show(
      [
        todo('m', { timeOfDay: 'morning' }),
        todo('a', { timeOfDay: 'afternoon' }),
        todo('e', { timeOfDay: 'evening' }),
      ],
      [],
    );
    await renderHabits();

    expect(screen.getByTestId('habits-section-afternoon-now')).toBeOnTheScreen();
    expect(screen.getByTestId('habits-section-morning-earlier')).toHaveTextContent(
      'Earlier · 1 left',
    );
    expect(screen.queryByTestId('habits-section-evening-now')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('habits-section-evening-earlier')).not.toBeOnTheScreen();
  });

  it('does not flag an earlier part whose things are all done', async () => {
    at(15);
    show([todo('m', { timeOfDay: 'morning', done: true })], []);
    await renderHabits();

    expect(screen.queryByTestId('habits-section-morning-earlier')).not.toBeOnTheScreen();
  });

  it('never marks "Anytime"', async () => {
    at(15);
    show([todo('x')], []);
    await renderHabits();

    expect(screen.queryByTestId('habits-section-anytime-now')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('habits-section-anytime-earlier')).not.toBeOnTheScreen();
  });
});

describe('HabitsHome to-dos', () => {
  it("puts today's to-dos in their part of the day, with the habits", async () => {
    show([
      todo('call', { timeOfDay: 'morning' }),
      todo('milk'),
      todo('tomorrow', { date: '2026-11-04' }),
    ]);
    await renderHabits();

    const morning = within(screen.getByTestId('habits-section-morning'));
    expect(morning.getByText('run')).toBeOnTheScreen();
    expect(morning.getByText('Task call')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('habits-section-anytime')).getByText('Task milk'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Task tomorrow')).not.toBeOnTheScreen();
  });

  it('shows a part of the day that has only to-dos, and the list with no habits at all', async () => {
    show([todo('eve', { timeOfDay: 'evening' })], []);
    await renderHabits();

    expect(
      within(screen.getByTestId('habits-section-evening')).getByText('Task eve'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('habits-empty')).not.toBeOnTheScreen();
  });

  it('offers the to-do field even with no habits and no to-dos', async () => {
    show([], []);
    await renderHabits();

    expect(screen.getByTestId('habits-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('habits-todo-add-input')).toBeOnTheScreen();
  });

  it('deletes a to-do from its swipe button', async () => {
    show([todo('a')]);
    await renderHabits();
    const user = userEvent.setup();

    await user.press(
      screen.getByTestId('habits-swipe-todo-a-archive', { includeHiddenElements: true }),
    );
    expect(mutate.remove).toHaveBeenCalledWith('a', expect.anything());
  });

  it('edits a to-do: new title and part of the day', async () => {
    show([todo('a')]);
    await renderHabits();
    const user = userEvent.setup();

    await user.press(
      screen.getByTestId('habits-swipe-todo-a-edit', { includeHiddenElements: true }),
    );
    expect(screen.getByTestId('habits-todo-edit-input').props.value).toBe('Task a');
    await fireEvent.changeText(screen.getByTestId('habits-todo-edit-input'), 'Call mom');
    await user.press(screen.getByTestId('habits-todo-edit-time-evening'));
    await user.press(screen.getByTestId('habits-todo-edit-save'));

    expect(mutate.update).toHaveBeenCalledWith(
      { id: 'a', title: 'Call mom', timeOfDay: 'evening' },
      expect.anything(),
    );
    expect(screen.queryByTestId('habits-todo-edit-sheet')).not.toBeOnTheScreen();
  });

  it('cannot save an edit with a blank title', async () => {
    show([todo('a')]);
    await renderHabits();

    await userEvent
      .setup()
      .press(screen.getByTestId('habits-swipe-todo-a-edit', { includeHiddenElements: true }));
    await fireEvent.changeText(screen.getByTestId('habits-todo-edit-input'), '   ');
    expect(screen.getByTestId('habits-todo-edit-save')).toBeDisabled();
  });

  it('adds a to-do for today in the chosen part of the day', async () => {
    show([]);
    await renderHabits();
    const user = userEvent.setup();

    await fireEvent.changeText(screen.getByTestId('habits-todo-add-input'), 'Call the dentist');
    await user.press(screen.getByTestId('habits-todo-add-time-morning'));
    await user.press(screen.getByTestId('habits-todo-add-submit'));

    expect(mutate.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Call the dentist',
        timeOfDay: 'morning',
        date: '2026-11-03',
        id: expect.any(String),
      }),
      expect.anything(),
    );
  });

  it('lists overdue to-dos in a card: move to today, done, delete', async () => {
    show([
      todo('old', { date: '2026-10-30' }),
      todo('done-old', { date: '2026-10-29', done: true }),
    ]);
    await renderHabits();
    const user = userEvent.setup();

    expect(screen.getByText('Overdue · 1')).toBeOnTheScreen();
    await user.press(screen.getByTestId('habits-overdue-old-move'));
    expect(mutate.move).toHaveBeenCalledWith({ id: 'old', date: '2026-11-03' }, expect.anything());
    await user.press(screen.getByTestId('habits-overdue-old-done'));
    expect(mutate.toggle).toHaveBeenCalledWith({ id: 'old', done: true }, expect.anything());
    await user.press(screen.getByTestId('habits-overdue-old-delete'));
    expect(mutate.remove).toHaveBeenCalledWith('old', expect.anything());
  });

  it('offers a retry when a change fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mutate.toggle.mockImplementation((_change, options) => options.onError());
    show([todo('a')]);
    await renderHabits();

    await userEvent.setup().press(screen.getByTestId('habits-todo-a-check'));
    expect(alert).toHaveBeenCalledWith("Couldn't save", expect.any(String), expect.any(Array));
  });
});
