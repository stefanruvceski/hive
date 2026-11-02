import type { HomeAppRow } from './home-groups';
import { type HomeSummaryResult, todayModules, visibleUpNext } from './home-summary';

const summary = (): HomeSummaryResult => ({ status: 'pending' });
const modules = [
  { id: 'habits', useHomeSummary: summary },
  { id: 'books' },
  { id: 'health', useHomeSummary: summary },
];
const row = (moduleId: string, hidden: boolean): HomeAppRow => ({
  moduleId,
  groupId: 'body-mind',
  position: 0,
  pinnedPosition: null,
  hidden,
});

describe('todayModules', () => {
  it.each([
    ['nothing stored', [], ['habits', 'health']],
    ['a hidden provider is left out', [row('health', true)], ['habits']],
    ['a stored, visible provider stays', [row('habits', false)], ['habits', 'health']],
    ['all providers hidden', [row('habits', true), row('health', true)], []],
  ])('%s', (_name, apps, expected) => {
    const result = todayModules(modules, { groups: [], apps });
    expect(result.map((module) => module.id)).toEqual(expected);
  });

  it('is empty without providers', () => {
    expect(todayModules([{ id: 'books' }], { groups: [], apps: [] })).toEqual([]);
  });
});

// A widget lists at most three; with more, two and "+N more" (#33 review).
describe('visibleUpNext', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  it.each([
    [0, [], 0],
    [1, ['a'], 0],
    [3, ['a', 'b', 'c'], 0],
    [4, ['a', 'b'], 2],
    [5, ['a', 'b'], 3],
  ])('%d to do → shows %o and %d more', (count, shown, more) => {
    expect(visibleUpNext(items.slice(0, count))).toEqual({ shown, more });
  });
});
