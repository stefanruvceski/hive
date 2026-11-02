import type { HomeAppRow } from './home-groups';
import { type HomeSummaryResult, todayModules } from './home-summary';

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
