import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { HiveModule } from '@/modules/registry';

import { Home } from './index';
import { useHomeLayout } from './use-home-layout';

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

// The database boundary: Home's data hook (docs/agent-rules/09 §5).
jest.mock('./use-home-layout');

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
  mockModules.length = 0;
  mockLayout({ data: noRows });
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

    expect(screen.getByTestId('home-group-money')).toHaveProp(
      'aria-label',
      'Money: Wallet, Invest',
    );
    expect(screen.getByTestId('home-group-money-name')).toHaveTextContent('Money');
    expect(screen.getByTestId('home-group-creative')).toBeOnTheScreen();
    // Habits is pinned: in the Dock, not repeated in Body & mind (which is then empty and not shown).
    expect(screen.getByRole('button', { name: 'Open Habits' })).toBeOnTheScreen();
    expect(screen.queryByTestId('home-group-body-mind')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('home-app-habits')).not.toBeOnTheScreen();
    // Customize comes with #31: shown, not usable yet.
    expect(screen.getByTestId('home-customize')).toBeDisabled();
  });

  // Temporary until the group sheet (#30): an app in a group card opens with one tap.
  it('opens an app from its group card', async () => {
    mockModules.push(module('habits', 'body-mind', 'habits'));
    await render(home);

    expect(screen.getByTestId('home-open-habits')).toBeOnTheScreen();
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
    expect(screen.getByRole('button', { name: 'Customize Home' })).toBeDisabled();
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
