import { defaultHomeGroups, hiveModules } from './registry';

// The group sheet lists every app by name with this line under it (#30).
describe('hiveModules', () => {
  it.each(hiveModules.map((module) => [module.id, module] as const))(
    '%s has a description and a default Home group',
    (_id, module) => {
      expect(module.description.trim()).not.toBe('');
      expect(defaultHomeGroups.map((group) => group.id)).toContain(module.group);
    },
  );
});
