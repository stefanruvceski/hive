import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsHome } from './index';
import {
  type Habit,
  useArchivedHabits,
  useArchiveHabit,
  useCompletions,
  useCreateHabit,
  useHabits,
  useRestoreHabit,
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
jest.mock('@/lib/haptics', () => ({ tapHaptic: jest.fn(), liftHaptic: jest.fn() }));
// Tuesday 3 November 2026.
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-03' }));

// A mutation that succeeds at once, like the real ones do after the write.
const succeeding = () =>
  jest.fn((_: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.());

const run = {
  archive: succeeding(),
  restore: jest.fn(),
  remove: succeeding(),
  add: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
};

const habit = {
  id: 'run',
  name: 'Run',
  emoji: '🏃',
  timeOfDay: 'morning',
  position: 0,
  createdAt: '2026-10-01',
  scheduleType: 'daily',
  scheduleDays: null,
  scheduleTimes: null,
  unit: null,
  target: null,
  quit: false,
} as Habit;

const task: Todo = {
  id: 'call',
  title: 'Call the dentist',
  date: '2026-11-03',
  timeOfDay: 'afternoon',
  done: false,
  position: 1,
} as Todo;

const show = (habits: Habit[], todos: Todo[]) => {
  jest.mocked(useHabits).mockReturnValue({ data: habits } as never);
  jest.mocked(useTodos).mockReturnValue({ data: todos } as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useCompletions).mockReturnValue({ data: [], refetch: jest.fn() } as never);
  jest.mocked(useArchivedHabits).mockReturnValue({ data: [] } as never);
  jest.mocked(useSetCompletion).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useSetAmount).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useReorder).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useToggleTodo).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useMoveTodo).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useUpdateTodo).mockReturnValue({ mutate: jest.fn() } as never);
  jest.mocked(useArchiveHabit).mockReturnValue({ mutate: run.archive } as never);
  jest.mocked(useRestoreHabit).mockReturnValue({ mutate: run.restore } as never);
  jest.mocked(useDeleteTodo).mockReturnValue({ mutate: run.remove } as never);
  jest.mocked(useAddTodo).mockReturnValue({ mutate: run.add } as never);
  jest
    .mocked(useCreateHabit)
    .mockReturnValue({ mutateAsync: run.create, isPending: false } as never);
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

describe('HabitsHome undo', () => {
  it('offers to take back deleting a to-do, and puts it back', async () => {
    show([habit], [task]);
    await renderHabits();
    const user = userEvent.setup();

    expect(screen.queryByTestId('habits-undo')).not.toBeOnTheScreen();
    await user.press(
      screen.getByTestId('habits-swipe-todo-call-archive', { includeHiddenElements: true }),
    );
    expect(screen.getByText('To-do deleted')).toBeOnTheScreen();

    await user.press(screen.getByTestId('habits-undo'));
    expect(run.add).toHaveBeenCalledWith({
      id: 'call',
      title: 'Call the dentist',
      date: '2026-11-03',
      timeOfDay: 'afternoon',
    });
    expect(screen.queryByTestId('habits-undo')).not.toBeOnTheScreen();
  });

  it('offers to take back archiving a habit, and restores it', async () => {
    show([habit], []);
    await renderHabits();
    const user = userEvent.setup();

    await user.press(
      screen.getByTestId('habits-swipe-run-archive', { includeHiddenElements: true }),
    );
    expect(screen.getByText('Habit archived')).toBeOnTheScreen();

    await user.press(screen.getByTestId('habits-undo'));
    expect(run.restore).toHaveBeenCalledWith('run');
  });
});

describe('HabitsHome starter suggestions', () => {
  it('offers them when there is nothing yet, and creates the picked ones in order', async () => {
    show([], []);
    await renderHabits();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('habits-suggestion-read'));
    await user.press(screen.getByTestId('habits-suggestion-water'));
    await user.press(screen.getByTestId('habits-suggestions-add'));

    expect(run.create.mock.calls.map(([created]) => created.name)).toEqual(['Drink water', 'Read']);
  });

  it('does not offer them once there is a habit', async () => {
    show([habit], []);
    await renderHabits();

    expect(screen.queryByTestId('habits-suggestions')).not.toBeOnTheScreen();
  });
});
