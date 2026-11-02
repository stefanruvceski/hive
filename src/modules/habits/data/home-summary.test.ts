import { renderHook } from '@testing-library/react-native';

import { useToday } from '@/hooks/use-today';

import { useHabitsHomeSummary } from './home-summary';
import { useCompletions, useHabits } from './queries';

// The database boundary: Habits' query hooks (docs/agent-rules/09 §5).
jest.mock('./queries');
jest.mock('@/hooks/use-today');

const habit = (id: string) => ({
  id,
  name: id,
  emoji: '🎯',
  timeOfDay: 'anytime' as const,
  position: 0,
  createdAt: '2026-11-01',
});

function mockQueries(habits: object, completions: object) {
  jest.mocked(useHabits).mockReturnValue(habits as never);
  jest.mocked(useCompletions).mockReturnValue(completions as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useToday).mockReturnValue('2026-11-02');
});

describe('useHabitsHomeSummary', () => {
  it('is pending until both habits and completions load', async () => {
    mockQueries({ data: [habit('a')] }, { isError: false });
    const { result } = await renderHook(() => useHabitsHomeSummary());
    expect(result.current).toEqual({ status: 'pending' });
  });

  it('fails when either query fails before it has data', async () => {
    mockQueries({ data: [habit('a')] }, { isError: true });
    const { result } = await renderHook(() => useHabitsHomeSummary());
    expect(result.current).toEqual({ status: 'error' });
  });

  it("counts today's completions, and keeps showing data when a refetch fails", async () => {
    mockQueries(
      { data: [habit('a'), habit('b')], isError: true },
      {
        data: [
          { habitId: 'a', date: '2026-11-02' },
          { habitId: 'b', date: '2026-11-01' },
        ],
      },
    );
    const { result } = await renderHook(() => useHabitsHomeSummary());
    expect(result.current).toEqual({
      status: 'success',
      summary: {
        kind: 'progress',
        done: 1,
        total: 2,
        caption: 'done today',
        label: '1 of 2 done today',
      },
    });
  });
});
