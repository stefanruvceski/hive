import { render, screen, userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useEditHome, useHomeLayout } from '@/hooks/use-home-layout';
import type { HiveModule } from '@/modules/registry';
import type { HomeAppRow } from '@/utils/home-groups';

import { Customize } from './index';

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

// The database boundary: the layout hooks (docs/agent-rules/09 §5). The rules behind each edit are
// tested in src/utils/home-edits.test.ts, the save and its rollback in use-home-layout.test.tsx.
jest.mock('@/hooks/use-home-layout');

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const module = (id: string, group: HiveModule['group']): HiveModule => ({
  id,
  title: id[0]!.toUpperCase() + id.slice(1),
  description: `${id} module`,
  icon: { ios: 'star', android: 'star', web: 'star' },
  tint: 'books',
  group,
  href: '/',
});

const app = (
  moduleId: string,
  groupId: string,
  position: number,
  extra: Partial<HomeAppRow> = {},
) => ({ moduleId, groupId, position, pinnedPosition: null, hidden: false, ...extra }) as HomeAppRow;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const customize = (
  <SafeAreaProvider initialMetrics={metrics}>
    <Customize />
  </SafeAreaProvider>
);

const edit = { mutate: jest.fn(), reset: jest.fn(), isError: false, variables: undefined };

function mockLayout(result: object) {
  jest.mocked(useHomeLayout).mockReturnValue(result as never);
}
function mockRows(apps: HomeAppRow[]) {
  mockLayout({ data: { groups: [], apps } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockModules.length = 0;
  mockModules.push(
    module('wallet', 'money'),
    module('habits', 'body-mind'),
    module('books', 'creative'),
    module('music', 'creative'),
  );
  mockRows([]);
  jest.mocked(useEditHome).mockReturnValue(edit as never);
});

describe('Customize', () => {
  it('shows the Dock, every group with its apps, and the hidden apps', async () => {
    mockRows([
      app('wallet', 'money', 0),
      app('habits', 'body-mind', 0, { pinnedPosition: 0 }),
      app('books', 'body-mind', 1),
      app('music', 'creative', 0, { hidden: true }),
    ]);
    await render(customize);

    expect(screen.getByRole('heading', { name: 'Customize Home' })).toBeOnTheScreen();
    expect(screen.getByTestId('customize-dock-count')).toHaveTextContent('1 of 4 pinned');
    expect(screen.getByRole('button', { name: 'Habits, in the Dock' })).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^customize-dock-empty-/)).toHaveLength(3);

    expect(screen.getByTestId('customize-group-money-name')).toHaveDisplayValue('Money');
    const body = within(screen.getByTestId('customize-group-body-mind'));
    expect(body.getByRole('button', { name: 'Habits, pinned' })).toBeOnTheScreen();
    expect(body.getByRole('button', { name: 'Books' })).toBeOnTheScreen();
    // Creative shows no apps (Music is hidden): it says so and can be deleted; the others can't.
    expect(screen.getByTestId('customize-group-creative-empty')).toHaveTextContent(
      'No apps in this group',
    );
    expect(screen.getByRole('button', { name: 'Delete group Creative' })).toBeOnTheScreen();
    expect(screen.queryByTestId('customize-group-money-delete')).not.toBeOnTheScreen();

    expect(screen.getByRole('button', { name: 'Music, hidden' })).toBeOnTheScreen();
    expect(screen.queryByTestId('customize-hidden-empty')).not.toBeOnTheScreen();
    expect(screen.queryByRole('toolbar')).not.toBeOnTheScreen();
  });

  it('says nothing is hidden, and starts from the default groups before any edit', async () => {
    await render(customize);

    expect(screen.getByTestId('customize-hidden-empty')).toHaveTextContent(
      'Nothing hidden. Hidden apps keep their data.',
    );
    expect(screen.getByTestId('customize-dock-count')).toHaveTextContent('0 of 4 pinned');
    expect(
      screen.getAllByTestId(/^customize-group-[a-z-]+-name$/).map((field) => field.props.value),
    ).toEqual(['Money', 'Body & mind', 'Creative']);
  });

  it('offers Pin, Hide, Cancel and "Move here" on every other group for the selected app', async () => {
    const user = userEvent.setup();
    await render(customize);

    await user.press(screen.getByRole('button', { name: 'Wallet' }));

    expect(screen.getByRole('button', { name: 'Wallet' })).toBeSelected();
    const bar = within(screen.getByRole('toolbar', { name: 'Wallet actions' }));
    expect(bar.getByRole('button', { name: 'Pin' })).toBeEnabled();
    expect(bar.getByRole('button', { name: 'Hide' })).toBeEnabled();
    expect(screen.getByTestId('customize-group-body-mind-move-here')).toHaveTextContent(
      'Move Wallet here',
    );
    expect(screen.getByTestId('customize-group-creative-move-here')).toBeOnTheScreen();
    expect(screen.queryByTestId('customize-group-money-move-here')).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('customize-group-creative-move-here'));

    expect(edit.mutate).toHaveBeenCalledWith({
      kind: 'move-app',
      moduleId: 'wallet',
      groupId: 'creative',
    });
    expect(screen.queryByRole('toolbar')).not.toBeOnTheScreen();
  });

  it('pins and hides the selected app, and Cancel clears the selection', async () => {
    const user = userEvent.setup();
    await render(customize);

    await user.press(screen.getByRole('button', { name: 'Books' }));
    await user.press(screen.getByRole('button', { name: 'Pin' }));
    expect(edit.mutate).toHaveBeenLastCalledWith({ kind: 'pin', moduleId: 'books' });

    await user.press(screen.getByRole('button', { name: 'Music' }));
    await user.press(screen.getByRole('button', { name: 'Hide' }));
    expect(edit.mutate).toHaveBeenLastCalledWith({ kind: 'hide', moduleId: 'music' });

    await user.press(screen.getByRole('button', { name: 'Habits' }));
    await user.press(screen.getByRole('button', { name: 'Cancel selection' }));
    expect(screen.queryByRole('toolbar')).not.toBeOnTheScreen();
    expect(edit.mutate).toHaveBeenCalledTimes(2);
  });

  it('offers Unpin for a pinned app, also from the Dock', async () => {
    const user = userEvent.setup();
    mockRows([app('habits', 'body-mind', 0, { pinnedPosition: 0 })]);
    await render(customize);

    await user.press(screen.getByRole('button', { name: 'Habits, in the Dock' }));
    await user.press(screen.getByRole('button', { name: 'Unpin' }));

    expect(edit.mutate).toHaveBeenCalledWith({ kind: 'unpin', moduleId: 'habits' });
  });

  it('makes Pin unavailable ("Dock full") when four apps are pinned', async () => {
    const user = userEvent.setup();
    mockModules.push(module('health', 'body-mind'));
    mockRows(
      ['wallet', 'habits', 'books', 'health'].map((id, index) =>
        app(id, mockModules.find((m) => m.id === id)!.group, index, { pinnedPosition: index }),
      ),
    );
    await render(customize);
    expect(screen.getByTestId('customize-dock-count')).toHaveTextContent('4 of 4 pinned');

    await user.press(screen.getByRole('button', { name: 'Music' }));
    const full = screen.getByRole('button', { name: 'Dock full' });
    expect(full).toBeDisabled();
    await user.press(full);

    expect(edit.mutate).not.toHaveBeenCalled();
  });

  it('brings a hidden app back by moving it to any group; it cannot be pinned or hidden again', async () => {
    const user = userEvent.setup();
    mockRows([app('music', 'creative', 0, { hidden: true })]);
    await render(customize);

    await user.press(screen.getByRole('button', { name: 'Music, hidden' }));
    expect(screen.getByRole('button', { name: 'Pin' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hidden' })).toBeDisabled();
    // Every group offers it a place, its old one too.
    expect(screen.getAllByText('Move Music here')).toHaveLength(3);

    await user.press(screen.getByTestId('customize-group-creative-move-here'));
    expect(edit.mutate).toHaveBeenCalledWith({
      kind: 'move-app',
      moduleId: 'music',
      groupId: 'creative',
    });
  });

  it('renames a group when its field is left, and puts the name back if it was emptied', async () => {
    const user = userEvent.setup();
    await render(customize);
    const field = screen.getByTestId('customize-group-money-name');

    await user.clear(field);
    expect(edit.mutate).not.toHaveBeenCalled();
    expect(field).toHaveDisplayValue('Money');

    await user.type(field, ' & more');
    expect(edit.mutate).toHaveBeenCalledTimes(1);
    expect(edit.mutate).toHaveBeenCalledWith({
      kind: 'rename-group',
      groupId: 'money',
      name: 'Money & more',
    });
  });

  it('moves groups up and down, but not past either end', async () => {
    const user = userEvent.setup();
    await render(customize);

    expect(screen.getByRole('button', { name: 'Move group Money up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move group Creative down' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Move group Money down' }));
    await user.press(screen.getByRole('button', { name: 'Move group Creative up' }));

    expect(edit.mutate.mock.calls).toEqual([
      [{ kind: 'move-group', groupId: 'money', by: 1 }],
      [{ kind: 'move-group', groupId: 'creative', by: -1 }],
    ]);
  });

  it('adds a group and deletes an empty one', async () => {
    const user = userEvent.setup();
    mockRows([app('books', 'money', 0), app('music', 'money', 1)]);
    await render(customize);

    await user.press(screen.getByRole('button', { name: 'New group' }));
    expect(edit.mutate).toHaveBeenLastCalledWith({
      kind: 'add-group',
      groupId: expect.stringMatching(/^group-[a-z0-9]+$/),
      name: 'New group',
    });

    await user.press(screen.getByRole('button', { name: 'Delete group Creative' }));
    expect(edit.mutate).toHaveBeenLastCalledWith({ kind: 'delete-group', groupId: 'creative' });
  });

  it('closes with Done', async () => {
    await render(customize);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Done' }));

    expect(router.back).toHaveBeenCalled();
  });

  it('shows a failed save with a way to try again', async () => {
    const user = userEvent.setup();
    const failed = { kind: 'pin', moduleId: 'books' };
    jest
      .mocked(useEditHome)
      .mockReturnValue({ ...edit, isError: true, variables: failed } as never);
    await render(customize);

    expect(screen.getByTestId('customize-save-error')).toHaveTextContent(
      /Couldn't save that change\./,
    );
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    expect(edit.mutate).toHaveBeenCalledWith(failed);

    await user.press(screen.getByRole('button', { name: 'Dismiss' }));
    expect(edit.reset).toHaveBeenCalled();
  });

  it('shows a loading state while the layout is read', async () => {
    mockLayout({ data: undefined, isError: false });
    await render(customize);

    expect(screen.getByTestId('customize-loading')).toBeOnTheScreen();
  });

  it('offers a retry when the layout cannot be read', async () => {
    const refetch = jest.fn();
    mockLayout({ data: undefined, isError: true, error: new Error('db'), refetch });
    await render(customize);

    await userEvent.setup().press(screen.getByTestId('customize-error-retry'));
    expect(refetch).toHaveBeenCalled();
    // Done still closes Customize when the layout can't be read.
    expect(screen.getByRole('button', { name: 'Done' })).toBeOnTheScreen();
  });
});
