import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppUsage, useRecordAppOpen } from '@/hooks/use-app-usage';
import { useHomeLayout } from '@/hooks/use-home-layout';
import type { HiveModule } from '@/modules/registry';

import { Home } from './index';

// The registry is the input under test; each test sets the modules it needs.
const mockModules: HiveModule[] = [];
// Getters, because jest.mock is hoisted above this const: a spread would read it too early.
jest.mock('@/modules/registry', () => ({
  get defaultHomeGroups() {
    return jest.requireActual('@/modules/registry').defaultHomeGroups;
  },
  get hiveModules() {
    return mockModules;
  },
}));

// The database boundary: Home's data hooks (docs/agent-rules/09 §5).
jest.mock('@/hooks/use-home-layout');
jest.mock('@/hooks/use-app-usage');
const recordOpen = { mutate: jest.fn() };

// Link needs a navigation container; here we only check what Home renders and where it goes.
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { push: jest.fn() },
}));

const module = (id: string, group: HiveModule['group'], tint: HiveModule['tint']): HiveModule => ({
  id,
  title: id[0]!.toUpperCase() + id.slice(1),
  description: `${id} module`,
  icon: { ios: 'star', android: 'star', web: 'star' },
  tint,
  group,
  href: '/',
});

const noRows = { groups: [], apps: [] };

// Expo Router provides safe areas in the app; tests give a phone-sized frame.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const home = (
  <SafeAreaProvider initialMetrics={metrics}>
    <Home />
  </SafeAreaProvider>
);

function mockLayout(result: object) {
  jest.mocked(useHomeLayout).mockReturnValue(result as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockModules.length = 0;
  mockLayout({ data: noRows });
  jest.mocked(useAppUsage).mockReturnValue({ data: [] } as never);
  jest.mocked(useRecordAppOpen).mockReturnValue(recordOpen as never);
});

describe('Home', () => {
  it('shows the date, a greeting and a Settings button that opens Settings', async () => {
    await render(home);

    expect(screen.getByTestId('home-date')).toBeOnTheScreen();
    expect(screen.getByTestId('home-title')).toHaveTextContent(
      /^Good (morning|afternoon|evening)$/,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Settings' }));
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('says no apps exist yet, without a Customize button, when there are no modules', async () => {
    await render(home);

    expect(screen.getByText('No apps yet')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-empty-customize')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('home-dock')).not.toBeOnTheScreen();
  });

  it('shows groups as cards with their name under them, and pinned apps only in the Dock', async () => {
    mockModules.push(
      module('wallet', 'money', 'wallet'),
      module('invest', 'money', 'invest'),
      module('habits', 'body-mind', 'habits'),
      module('books', 'creative', 'books'),
    );
    mockLayout({
      data: {
        groups: [],
        apps: [
          {
            moduleId: 'habits',
            groupId: 'body-mind',
            position: 0,
            pinnedPosition: 0,
            hidden: false,
          },
        ],
      },
    });
    await render(home);

    expect(screen.getByTestId('home-group-money')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open Wallet' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open Invest' })).toBeOnTheScreen();
    expect(screen.getByTestId('home-group-money-name')).toHaveTextContent('Money');
    expect(screen.getByTestId('home-group-creative')).toBeOnTheScreen();
    // Habits is pinned: in the Dock, not repeated in Body & mind (which is then empty and not shown).
    expect(screen.getByRole('button', { name: 'Open Habits' })).toBeOnTheScreen();
    expect(screen.queryByTestId('home-group-body-mind')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('home-app-habits')).not.toBeOnTheScreen();
    // The Dock's Customize button opens Customize Home (#31; it was shown disabled until then).
    await userEvent.setup().press(screen.getByRole('button', { name: 'Customize Home' }));
    expect(router.push).toHaveBeenCalledWith('/customize');
  });

  it('opens an app straight from a group card with four apps or fewer, and counts the open', async () => {
    mockModules.push(module('habits', 'body-mind', 'habits'));
    await render(home);

    expect(screen.queryByTestId('home-group-body-mind-more')).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Open Habits' }));
    expect(recordOpen.mutate).toHaveBeenCalledWith({
      moduleId: 'habits',
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(router.push).toHaveBeenCalledWith('/');
  });

  it('keeps the three most used apps big and opens the whole group from the fourth spot', async () => {
    mockModules.push(
      ...['books', 'drawify', 'music', 'photos', 'films'].map((id) =>
        module(id, 'creative', 'books'),
      ),
    );
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    jest.mocked(useAppUsage).mockReturnValue({
      data: [
        { moduleId: 'films', date, opens: 3 },
        { moduleId: 'music', date, opens: 1 },
      ],
    } as never);
    await render(home);

    const big = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.props.testID);
    expect(big).toEqual(['home-open-films', 'home-open-music', 'home-open-books']);
    await userEvent
      .setup()
      .press(screen.getByRole('button', { name: 'Creative: show all 5 apps' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/group/[id]',
      params: { id: 'creative' },
    });
  });

  it('shows the empty Home with Customize when every app is hidden', async () => {
    mockModules.push(module('books', 'creative', 'books'));
    mockLayout({
      data: {
        groups: [],
        apps: [
          {
            moduleId: 'books',
            groupId: 'creative',
            position: 0,
            pinnedPosition: null,
            hidden: true,
          },
        ],
      },
    });
    await render(home);

    expect(screen.getByText('Your Home is empty')).toBeOnTheScreen();
    // Opens Customize Home, where hidden apps are brought back (#31; disabled until then).
    await userEvent.setup().press(screen.getByRole('button', { name: 'Customize Home' }));
    expect(router.push).toHaveBeenCalledWith('/customize');
  });

  it('shows a loading state while the layout is read', async () => {
    mockLayout({ data: undefined, isError: false });
    await render(home);

    expect(screen.getByTestId('home-loading')).toBeOnTheScreen();
  });

  it('offers a retry when the layout cannot be read', async () => {
    const refetch = jest.fn();
    mockLayout({ data: undefined, isError: true, error: new Error('db'), refetch });
    await render(home);

    await userEvent.setup().press(screen.getByTestId('home-error-retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
