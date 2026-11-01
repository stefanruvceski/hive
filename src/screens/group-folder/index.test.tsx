import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppUsage, useRecordAppOpen } from '@/hooks/use-app-usage';
import { useHomeLayout } from '@/hooks/use-home-layout';
import type { HiveModule } from '@/modules/registry';
import { toIsoDate } from '@/utils/format-date';

import { GroupFolder } from './index';

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

// The database boundary: Home's data hooks, shared with the folder (docs/agent-rules/09 §5).
jest.mock('@/hooks/use-home-layout');
jest.mock('@/hooks/use-app-usage');
const recordOpen = { mutate: jest.fn() };

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), dismiss: jest.fn(), navigate: jest.fn() },
}));

const module = (id: string): HiveModule => ({
  id,
  title: id[0]!.toUpperCase() + id.slice(1),
  description: `About ${id}`,
  icon: { ios: 'star', android: 'star', web: 'star' },
  tint: 'books',
  group: 'creative',
  href: `/${id}` as HiveModule['href'],
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const folder = (groupId: string) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <GroupFolder groupId={groupId} />
  </SafeAreaProvider>
);

function mockLayout(result: object) {
  jest.mocked(useHomeLayout).mockReturnValue(result as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockModules.length = 0;
  mockLayout({ data: { groups: [], apps: [] } });
  jest.mocked(useAppUsage).mockReturnValue({ data: [] } as never);
  jest.mocked(useRecordAppOpen).mockReturnValue(recordOpen as never);
});

describe('GroupFolder', () => {
  it('shows every app in the group, most used first, without pinned ones', async () => {
    mockModules.push(...['books', 'drawify', 'music', 'photos', 'films', 'radio'].map(module));
    mockLayout({
      data: {
        groups: [],
        apps: [
          { moduleId: 'radio', groupId: 'creative', position: 0, pinnedPosition: 0, hidden: false },
        ],
      },
    });
    jest.mocked(useAppUsage).mockReturnValue({
      data: [{ moduleId: 'photos', date: toIsoDate(new Date()), opens: 2 }],
    } as never);
    await render(folder('creative'));

    expect(screen.getByRole('heading', { name: 'Creative' })).toBeOnTheScreen();
    const apps = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.props.testID);
    expect(apps).toEqual([
      'group-open-photos',
      'group-open-books',
      'group-open-drawify',
      'group-open-music',
      'group-open-films',
    ]);
    expect(screen.getByTestId('group-open-books')).toHaveTextContent('Books');
  });

  it('closes the folder and opens Customize Home at this group from "Edit group"', async () => {
    mockModules.push(module('books'));
    await render(folder('creative'));

    // Disabled until #31; now it closes the folder first, so Customize isn't presented inside it.
    await userEvent.setup().press(screen.getByRole('button', { name: 'Edit group' }));

    expect(router.dismiss).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/customize',
      params: { group: 'creative' },
    });
    expect(jest.mocked(router.dismiss).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(router.navigate).mock.invocationCallOrder[0]!,
    );
  });

  it('counts the open and closes the folder before opening an app, so Back returns to Home', async () => {
    mockModules.push(module('books'));
    await render(folder('creative'));

    await userEvent.setup().press(screen.getByRole('button', { name: 'Open Books' }));

    expect(recordOpen.mutate).toHaveBeenCalledWith({
      moduleId: 'books',
      today: toIsoDate(new Date()),
    });
    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith('/books');
    expect(jest.mocked(router.dismiss).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(router.navigate).mock.invocationCallOrder[0]!,
    );
  });

  it('closes when the dimmed Home around it is tapped', async () => {
    mockModules.push(module('books'));
    await render(folder('creative'));

    await userEvent.setup().press(screen.getByRole('button', { name: 'Close Creative' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('says the group has nothing to show when it is unknown or empty, with a way out', async () => {
    mockModules.push(module('books'));
    await render(folder('money'));

    expect(screen.getByTestId('group-folder-missing')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('group-folder-missing-close'));
    expect(router.back).toHaveBeenCalled();
  });

  it('shows a loading state while the layout is read', async () => {
    mockLayout({ data: undefined, isError: false });
    await render(folder('creative'));

    expect(screen.getByTestId('group-folder-loading')).toBeOnTheScreen();
  });

  it('offers a retry when the layout cannot be read', async () => {
    const refetch = jest.fn();
    mockLayout({ data: undefined, isError: true, error: new Error('db'), refetch });
    await render(folder('creative'));

    await userEvent.setup().press(screen.getByTestId('group-folder-error-retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
