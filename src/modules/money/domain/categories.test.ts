import { defaultCategories, nameTaken, normalizeName } from './categories';

describe('defaultCategories', () => {
  it('gives each space an expense and an income category, with unique names per kind', () => {
    for (const list of Object.values(defaultCategories)) {
      expect(list.some((c) => c.kind === 'expense')).toBe(true);
      expect(list.some((c) => c.kind === 'income')).toBe(true);
      const keys = list.map((c) => `${c.kind}:${c.name}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('has fuel for the company', () => {
    expect(defaultCategories.business.some((c) => c.name === 'Fuel')).toBe(true);
  });
});

describe('normalizeName and nameTaken', () => {
  it('trims and collapses spaces, refusing an empty name', () => {
    expect(normalizeName('  Eating   out ')).toBe('Eating out');
    expect(normalizeName('   ')).toBeNull();
  });

  it('finds a live category with the same name, ignoring case and archived ones', () => {
    const list = [
      { kind: 'expense' as const, name: 'Food', archivedAt: null },
      { kind: 'expense' as const, name: 'Old', archivedAt: '2026-01-01' },
    ];
    expect(nameTaken(list, 'expense', 'food')).toBe(true);
    expect(nameTaken(list, 'income', 'Food')).toBe(false);
    expect(nameTaken(list, 'expense', 'Old')).toBe(false);
  });
});
