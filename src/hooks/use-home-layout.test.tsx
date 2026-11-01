import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { getDb } from '@/lib/db/client';
import { homeApps, homeGroups } from '@/lib/db/schema';
import type { HomeRows } from '@/utils/home-groups';
import { HomeEditError } from '@/utils/home-edits';

import { homeLayoutKeys, useEditHome, useHomeLayout } from './use-home-layout';

// expo-sqlite has no Jest implementation, so the database itself is the boundary here: a small
// in-memory stand-in for the Drizzle calls the hook makes. A transaction commits only if its
// callback returns, like SQLite's.
jest.mock('@/lib/db/client', () => ({ getDb: jest.fn() }));

type Tables = { groups: HomeRows['groups'][number][]; apps: HomeRows['apps'][number][] };

function fakeDb(tables: Tables, { failWrites = false } = {}) {
  const name = (table: unknown) => (table === homeGroups ? 'groups' : 'apps') as keyof Tables;
  const on = (data: Tables) => ({
    select: () => ({
      from: (table: unknown) => ({ all: () => structuredClone(data[name(table)]) }),
    }),
    delete: (table: unknown) => ({
      run: () => {
        if (failWrites) throw new Error('disk I/O error');
        data[name(table)] = [];
      },
    }),
    insert: (table: unknown) => ({
      values: (rows: never[]) => ({
        run: () => {
          data[name(table)] = [...data[name(table)], ...structuredClone(rows)];
        },
      }),
    }),
  });
  return {
    ...on(tables),
    transaction: (write: (tx: ReturnType<typeof on>) => void) => {
      const draft = structuredClone(tables);
      write(on(draft));
      tables.groups = draft.groups;
      tables.apps = draft.apps;
    },
  };
}

const modules = [
  { id: 'habits', group: 'body-mind' },
  { id: 'books', group: 'creative' },
  { id: 'music', group: 'creative' },
  { id: 'money', group: 'money' },
  { id: 'wallet', group: 'money' },
];
const defaults = [
  { id: 'money', name: 'Money' },
  { id: 'body-mind', name: 'Body & mind' },
  { id: 'creative', name: 'Creative' },
];

function setup(tables: Tables, options?: { failWrites?: boolean }) {
  jest.mocked(getDb).mockReturnValue(fakeDb(tables, options) as never);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  // Every version of the layout the cache held, to see the optimistic step and the rollback.
  const seen: unknown[] = [];
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'success') {
      seen.push(structuredClone(event.query.state.data));
    }
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, seen, wrapper };
}

const habitsGroup = (rows: HomeRows | undefined) =>
  rows?.apps.find((row) => row.moduleId === 'habits')?.groupId;

describe('useEditHome', () => {
  it('writes the whole arrangement on the first edit, so the defaults become rows', async () => {
    const tables: Tables = { groups: [], apps: [] };
    const { wrapper } = setup(tables);
    const { result } = await renderHook(
      () => ({ layout: useHomeLayout(), edit: useEditHome(modules, defaults) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.layout.isSuccess).toBe(true));

    await act(() =>
      result.current.edit.mutate({ kind: 'move-app', moduleId: 'habits', groupId: 'creative' }),
    );

    await waitFor(() => expect(result.current.edit.isSuccess).toBe(true));
    expect(tables.groups.map((group) => group.id)).toEqual(['money', 'body-mind', 'creative']);
    expect(tables.apps.map((row) => row.moduleId).sort()).toEqual(
      modules.map((module) => module.id).sort(),
    );
    expect(tables.apps.find((row) => row.moduleId === 'habits')).toMatchObject({
      groupId: 'creative',
      position: 2,
    });
    // Home re-reads the layout after the save.
    await waitFor(() => expect(habitsGroup(result.current.layout.data)).toBe('creative'));
  });

  it('shows the change at once and rolls it back when the save fails', async () => {
    const tables: Tables = { groups: [], apps: [] };
    const { queryClient, seen, wrapper } = setup(tables, { failWrites: true });
    const { result } = await renderHook(
      () => ({ layout: useHomeLayout(), edit: useEditHome(modules, defaults) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.layout.isSuccess).toBe(true));

    await act(() =>
      result.current.edit.mutate({ kind: 'move-app', moduleId: 'habits', groupId: 'creative' }),
    );

    await waitFor(() => expect(result.current.edit.isError).toBe(true));
    expect(seen.map((rows) => habitsGroup(rows as HomeRows))).toContain('creative');
    expect(queryClient.getQueryData<HomeRows>(homeLayoutKeys.all)).toEqual({
      groups: [],
      apps: [],
    });
    expect(tables).toEqual({ groups: [], apps: [] });
  });

  it('refuses an edit the rules do not allow, and changes nothing', async () => {
    const tables: Tables = {
      groups: defaults.map((group, position) => ({ ...group, position })),
      apps: modules.map((module, index) => ({
        moduleId: module.id,
        groupId: module.group,
        position: index,
        pinnedPosition: index < 4 ? index : null,
        hidden: false,
      })),
    };
    const before = structuredClone(tables);
    const { queryClient, wrapper } = setup(tables);
    const { result } = await renderHook(
      () => ({ layout: useHomeLayout(), edit: useEditHome(modules, defaults) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.layout.isSuccess).toBe(true));

    await act(() => result.current.edit.mutate({ kind: 'pin', moduleId: 'wallet' }));

    await waitFor(() => expect(result.current.edit.isError).toBe(true));
    expect(result.current.edit.error).toBeInstanceOf(HomeEditError);
    expect((result.current.edit.error as HomeEditError).reason).toBe('dock-full');
    expect(tables).toEqual(before);
    expect(queryClient.getQueryData(homeLayoutKeys.all)).toEqual(before);
  });
});
