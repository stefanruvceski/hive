import { arrangeHome, cardTiles, findGroup, type HomeAppRow } from './home-groups';

const defaults = [
  { id: 'money', name: 'Money' },
  { id: 'body-mind', name: 'Body & mind' },
  { id: 'creative', name: 'Creative' },
] as const;

const mod = (id: string, group: string) => ({ id, group });
const app = (moduleId: string, over: Partial<HomeAppRow> = {}): HomeAppRow => ({
  moduleId,
  groupId: 'creative',
  position: 0,
  pinnedPosition: null,
  hidden: false,
  ...over,
});

const ids = (view: ReturnType<typeof arrangeHome>) =>
  view.state === 'apps'
    ? {
        groups: view.groups.map((g) => [g.name, g.apps.map((a) => a.id)]),
        pinned: view.pinned.map((a) => a.id),
      }
    : view.state;

describe('arrangeHome', () => {
  it('says so when no module exists', () => {
    expect(arrangeHome([], { groups: [], apps: [] }, defaults)).toEqual({ state: 'no-modules' });
  });

  it('puts modules in their default groups, in registry order, skipping empty groups', () => {
    const modules = [
      mod('books', 'creative'),
      mod('health', 'body-mind'),
      mod('music', 'creative'),
    ];

    expect(ids(arrangeHome(modules, { groups: [], apps: [] }, defaults))).toEqual({
      groups: [
        ['Body & mind', ['health']],
        ['Creative', ['books', 'music']],
      ],
      pinned: [],
    });
  });

  it('follows stored groups, places and pins; pinned apps are not repeated in their group', () => {
    const modules = [
      mod('books', 'creative'),
      mod('music', 'creative'),
      mod('habits', 'body-mind'),
    ];
    const rows = {
      groups: [
        { id: 'fun', name: 'Fun', position: 0 },
        { id: 'creative', name: 'Creative', position: 1 },
      ],
      apps: [
        app('music', { groupId: 'fun', position: 0 }),
        app('books', { groupId: 'creative', position: 0, pinnedPosition: 1 }),
        app('habits', { groupId: 'creative', position: 1, pinnedPosition: 0 }),
      ],
    };

    expect(ids(arrangeHome(modules, rows, defaults))).toEqual({
      groups: [['Fun', ['music']]],
      pinned: ['habits', 'books'],
    });
  });

  it('leaves hidden apps out and reports when every app is hidden', () => {
    const modules = [mod('books', 'creative'), mod('music', 'creative')];
    const someHidden = { groups: [], apps: [app('books', { hidden: true })] };
    const allHidden = {
      groups: [],
      apps: [app('books', { hidden: true }), app('music', { hidden: true, position: 1 })],
    };

    expect(ids(arrangeHome(modules, someHidden, defaults))).toEqual({
      groups: [['Creative', ['music']]],
      pinned: [],
    });
    expect(arrangeHome(modules, allHidden, defaults)).toEqual({ state: 'all-hidden' });
  });

  it('adds new modules at the end of their group and ignores rows for removed modules', () => {
    const modules = [mod('drawify', 'creative'), mod('books', 'creative')];
    const rows = { groups: [], apps: [app('books'), app('gone', { position: 1 })] };

    expect(ids(arrangeHome(modules, rows, defaults))).toEqual({
      groups: [['Creative', ['books', 'drawify']]],
      pinned: [],
    });
  });

  it('puts an app whose group no longer exists into the first group', () => {
    const modules = [mod('books', 'creative'), mod('wallet', 'money')];
    const rows = { groups: [{ id: 'mine', name: 'Mine', position: 0 }], apps: [] };

    expect(ids(arrangeHome(modules, rows, defaults))).toEqual({
      groups: [['Mine', ['books', 'wallet']]],
      pinned: [],
    });
  });

  it('keeps at most four apps in the Dock', () => {
    const modules = ['a', 'b', 'c', 'd', 'e'].map((id) => mod(id, 'creative'));
    const rows = {
      groups: [],
      apps: modules.map((m, i) => app(m.id, { position: i, pinnedPosition: i })),
    };

    expect(ids(arrangeHome(modules, rows, defaults))).toEqual({
      groups: [['Creative', ['e']]],
      pinned: ['a', 'b', 'c', 'd'],
    });
  });
});

describe('findGroup', () => {
  const modules = [
    mod('books', 'creative'),
    mod('drawify', 'creative'),
    mod('music', 'creative'),
    mod('health', 'body-mind'),
    mod('photos', 'creative'),
    mod('films', 'creative'),
  ];

  it('gives a group with every app it shows, beyond the four on its card, pinned ones left out', () => {
    const view = arrangeHome(
      modules,
      { groups: [], apps: [app('music', { position: 0, pinnedPosition: 0 })] },
      defaults,
    );

    const group = findGroup(view, 'creative');
    expect(group?.name).toBe('Creative');
    expect(group?.apps.map((a) => a.id)).toEqual(['books', 'drawify', 'photos', 'films']);
  });

  it('gives null for a group that is unknown, empty or not on Home', () => {
    const view = arrangeHome(modules, { groups: [], apps: [] }, defaults);

    expect(findGroup(view, 'nope')).toBeNull();
    expect(findGroup(view, 'money')).toBeNull();
    expect(findGroup({ state: 'all-hidden' }, 'creative')).toBeNull();
  });
});

describe('cardTiles', () => {
  const apps = (...ids: string[]) => ids.map((id) => ({ id }));
  const ids = (list: { id: string }[]) => list.map((a) => a.id);

  it('opens every app straight from the card when the group has four or fewer, in group order', () => {
    const tiles = cardTiles(apps('a', 'b', 'c', 'd'), apps('d', 'c', 'b', 'a'));

    expect(ids(tiles.open)).toEqual(['a', 'b', 'c', 'd']);
    expect(tiles.more).toEqual([]);
  });

  it('keeps the three most used big and moves the rest to the fourth spot when there are more', () => {
    const tiles = cardTiles(apps('a', 'b', 'c', 'd', 'e'), apps('e', 'c', 'a', 'b', 'd'));

    expect(ids(tiles.open)).toEqual(['e', 'c', 'a']);
    expect(ids(tiles.more)).toEqual(['b', 'd']);
  });
});
