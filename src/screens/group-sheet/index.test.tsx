import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useHomeLayout } from '@/hooks/use-home-layout';
import type { HiveModule } from '@/modules/registry';

import { GroupSheet } from './index';

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

// The database boundary: Home's data hook, shared with the sheet (docs/agent-rules/09 §5).
jest.mock('@/hooks/use-home-layout');

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), dismiss: jest.fn(), navigate: jest.fn() },
}));

const module = (id: string, description = `About ${id}`): HiveModule => ({
  id,
  title: id[0]!.toUpperCase() + id.slice(1),
  description,
  icon: { ios: 'star', android: 'star', web: 'star' },
  tint: 'books',
  group: 'creative',
  href: `/${id}` as HiveModule['href'],
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 560 },
  insets: { top: 0, left: 0, right: 0, bottom: 34 },
};
const sheet = (groupId: string) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <GroupSheet groupId={groupId} />
  </SafeAreaProvider>
);

function mockLayout(result: object) {
  jest.mocked(useHomeLayout).mockReturnValue(result as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockModules.length = 0;
  mockLayout({ data: { groups: [], apps: [] } });
});

describe('GroupSheet', () => {
  it('lists every app in the group, including those beyond the card, but not pinned ones', async () => {
    mockModules.push(
      module('books'),
      module('drawify'),
      module('music'),
      module('photos'),
      module('films'),
      module('radio'),
    );
    mockLayout({
      data: {
        groups: [],
        apps: [
          { moduleId: 'radio', groupId: 'creative', position: 0, pinnedPosition: 0, hidden: false },
        ],
      },
    });
    await render(sheet('creative'));

    expect(screen.getByRole('heading', { name: 'Creative' })).toBeOnTheScreen();
    expect(screen.getByTestId('group-sheet-count')).toHaveTextContent('5 apps');
    const rows = screen.getAllByRole('button', { name: /^(Books|Drawify|Music|Photos|Films),/ });
    expect(rows.map((row) => row.props.testID)).toEqual([
      'home-open-books',
      'home-open-drawify',
      'home-open-music',
      'home-open-photos',
      'home-open-films',
    ]);
    expect(screen.getByRole('button', { name: 'Books, About books' })).toBeOnTheScreen();
    expect(screen.getByTestId('group-sheet-about-books')).toHaveTextContent('About books');
    expect(screen.queryByTestId('home-open-radio')).not.toBeOnTheScreen();
    // Customize Home comes with #31: shown, not usable yet.
    expect(screen.getByRole('button', { name: 'Edit group' })).toBeDisabled();
  });

  it('closes the sheet before opening an app, so Back returns to Home', async () => {
    mockModules.push(module('books'));
    await render(sheet('creative'));

    await userEvent.setup().press(screen.getByTestId('home-open-books'));

    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith('/books');
    expect(jest.mocked(router.dismiss).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(router.navigate).mock.invocationCallOrder[0]!,
    );
  });

  it('shows the name alone when an app has no description, and closes with Close', async () => {
    mockModules.push(module('music', ''));
    await render(sheet('creative'));

    expect(screen.getByTestId('group-sheet-count')).toHaveTextContent('1 app');
    expect(screen.getByRole('button', { name: 'Music' })).toBeOnTheScreen();
    expect(screen.queryByTestId('group-sheet-about-music')).not.toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Close' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('says the group has nothing to show when it is unknown or empty, with a way out', async () => {
    mockModules.push(module('books'));
    await render(sheet('money'));

    expect(screen.getByTestId('group-sheet-missing')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('group-sheet-missing-close'));
    expect(router.back).toHaveBeenCalled();
  });

  it('shows a loading state while the layout is read', async () => {
    mockLayout({ data: undefined, isError: false });
    await render(sheet('creative'));

    expect(screen.getByTestId('group-sheet-loading')).toBeOnTheScreen();
  });

  it('offers a retry when the layout cannot be read', async () => {
    const refetch = jest.fn();
    mockLayout({ data: undefined, isError: true, error: new Error('db'), refetch });
    await render(sheet('creative'));

    await userEvent.setup().press(screen.getByTestId('group-sheet-error-retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
