import { defaultHomeGroups, hiveModules } from './registry';

// Every module needs a one-line description and a Home group it starts in.
describe('hiveModules', () => {
  it.each(hiveModules.map((module) => [module.id, module] as const))(
    '%s has a description and a default Home group',
    (_id, module) => {
      expect(module.description.trim()).not.toBe('');
      expect(defaultHomeGroups.map((group) => group.id)).toContain(module.group);
    },
  );
});
