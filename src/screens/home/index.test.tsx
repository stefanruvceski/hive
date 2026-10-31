import { render, screen, userEvent } from '@testing-library/react-native';

import type { HiveModule } from '@/modules/registry';

import { Home } from './index';
import { useHomeLayout, useSaveHomeLayout } from './use-home-layout';

// The registry is the input under test; each test sets the modules it needs.
const mockModules: HiveModule[] = [];
// A getter, because jest.mock is hoisted above this const.
jest.mock('@/modules/registry', () => ({
  get hiveModules() {
    return mockModules;
  },
}));

// The database boundary: Home's data hooks (docs/agent-rules/09 §5).
jest.mock('./use-home-layout');
const mutate = jest.fn();

// Link needs a navigation container; here we only check what Home renders and saves.
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const module = (id: string): HiveModule => ({
  id,
  title: id[0]!.toUpperCase() + id.slice(1),
  description: `${id} module`,
  icon: { ios: 'star', android: 'star', web: 'star' },
  href: '/',
});

beforeEach(() => {
  mockModules.length = 0;
  mutate.mockReset();
  jest.mocked(useHomeLayout).mockReturnValue({ data: [] } as never);
  jest.mocked(useSaveHomeLayout).mockReturnValue({ mutate, isError: false } as never);
});

describe('Home', () => {
  it('shows the empty state when no modules exist', async () => {
    await render(<Home />);

    expect(screen.getByTestId('home-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-edit')).not.toBeOnTheScreen();
  });

  it('explains how to bring back modules when all are hidden', async () => {
    mockModules.push(module('habits'));
    jest.mocked(useHomeLayout).mockReturnValue({
      data: [{ moduleId: 'habits', position: 0, hidden: true }],
    } as never);
    await render(<Home />);

    expect(screen.getByTestId('home-all-hidden')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeOnTheScreen();
  });

  it('lists modules in the stored order and saves reorder and hide edits', async () => {
    mockModules.push(module('habits'), module('health'));
    jest.mocked(useHomeLayout).mockReturnValue({
      data: [
        { moduleId: 'health', position: 0, hidden: false },
        { moduleId: 'habits', position: 1, hidden: true },
      ],
    } as never);
    const user = userEvent.setup();
    await render(<Home />);

    // Hidden modules are not shown outside edit mode.
    expect(screen.getByTestId('home-card-health')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-card-habits')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('home-card-habits')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Move Health down' }));
    expect(mutate).toHaveBeenLastCalledWith([
      { moduleId: 'habits', position: 0, hidden: true },
      { moduleId: 'health', position: 1, hidden: false },
    ]);

    await user.press(screen.getByRole('button', { name: 'Show Habits' }));
    expect(mutate).toHaveBeenLastCalledWith([
      { moduleId: 'health', position: 0, hidden: false },
      { moduleId: 'habits', position: 1, hidden: false },
    ]);
  });
});
