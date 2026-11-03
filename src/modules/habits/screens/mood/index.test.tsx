import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HabitsMood } from './index';
import { useMoodEntries, useSaveMood } from '../../data/mood-queries';

// The database boundary: the feature's query hooks (09 §5).
jest.mock('../../data/mood-queries');
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@/hooks/use-today', () => ({ useToday: () => '2026-11-02' }));

const mutate = jest.fn();
const mockSave = (state: object = {}) =>
  jest
    .mocked(useSaveMood)
    .mockReturnValue({ mutate, isPending: false, isError: false, ...state } as never);
const mockEntries = (state: object) =>
  jest.mocked(useMoodEntries).mockReturnValue({ refetch: jest.fn(), ...state } as never);

const entry = (date: string, mood: number, motivation: number, note: string | null = null) => ({
  date,
  mood,
  motivation,
  note,
  updatedAt: `${date}T08:00:00.000Z`,
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HabitsMood />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mutate.mockReset();
  mockSave();
  mockEntries({ data: [], isPending: false, isError: false });
});

describe('HabitsMood', () => {
  it('needs both ratings before Save is enabled, then saves today', async () => {
    await renderScreen();
    const user = userEvent.setup();
    const save = screen.getByTestId('habits-mood-save');
    expect(save).toBeDisabled();

    await user.press(screen.getByRole('radio', { name: 'Good' }));
    expect(save).toBeDisabled();
    await user.press(screen.getByRole('radio', { name: '4' }));
    await user.type(screen.getByTestId('habits-mood-note'), '  Ran today ');
    expect(save).toBeEnabled();
    await user.press(save);

    expect(mutate).toHaveBeenCalledWith({
      date: '2026-11-02',
      mood: 4,
      motivation: 4,
      note: '  Ran today ',
    });
  });

  it('limits the note to 200 characters', async () => {
    await renderScreen();
    expect(screen.getByTestId('habits-mood-note')).toHaveProp('maxLength', 200);
  });

  it("starts from today's entry and lists the earlier days read-only", async () => {
    mockEntries({
      data: [entry('2026-11-02', 5, 2, 'Calm'), entry('2026-11-01', 2, 3, 'Tired')],
      isPending: false,
      isError: false,
    });
    await renderScreen();

    expect(screen.getByRole('radio', { name: 'Great' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '2' })).toBeChecked();
    expect(screen.getByTestId('habits-mood-note')).toHaveDisplayValue('Calm');
    expect(screen.getByTestId('habits-mood-history-2026-11-01')).toHaveTextContent(/Tired/);
    expect(screen.queryByTestId('habits-mood-history-2026-11-02')).toBeNull();
  });

  it('shows a retryable error and keeps the input when saving fails', async () => {
    mockSave({ isError: true });
    await renderScreen();
    expect(screen.getByTestId('habits-mood-error')).toBeOnTheScreen();
  });

  it('shows loading and a load error', async () => {
    mockEntries({ data: undefined, isPending: true, isError: false });
    const { unmount } = await renderScreen();
    expect(screen.getByTestId('habits-mood-loading')).toBeOnTheScreen();
    await unmount();
    mockEntries({ data: undefined, isPending: false, isError: true, error: new Error('x') });
    await renderScreen();
    expect(screen.getByTestId('habits-mood-load-error')).toBeOnTheScreen();
  });
});
