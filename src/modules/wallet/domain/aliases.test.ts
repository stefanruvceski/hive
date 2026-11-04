import {
  type AliasGroup,
  canonical,
  groupOf,
  groupsFromRows,
  merge,
  pair,
  rename,
  rowsFromGroups,
  unmerge,
} from './aliases';

// Ported from hive-poc AliasesTest.kt.
describe('aliases', () => {
  it('merges, renames and unmerges', () => {
    let g: AliasGroup[] = merge([], 'A', 'B');
    expect(canonical(g, 'B')).toBe('A');
    g = rename(g, 'B', 'Nice');
    g = merge(g, 'C', 'A'); // C joins the named group: the name stays
    expect(g).toHaveLength(1);
    expect(g[0]?.keys).toEqual(['C', 'A', 'B']);
    expect(g[0]?.name).toBe('Nice');
    expect(merge(g, 'A', 'B')).toEqual(g);
    expect(unmerge(g, 'B')).toEqual([]);
    expect(canonical(g, 'X')).toBe('X');
  });

  it('renames a key that has no group yet, and clears with a blank name', () => {
    const g = rename([], 'A', ' Mine ');
    expect(groupOf(g, 'A')?.name).toBe('Mine');
    expect(rename(g, 'A', '')).toEqual([]);
    expect(groupOf(rename([], 'A', null), 'A')).toBeUndefined();
    expect(pair('B', 'A')).toBe('A|B');
  });

  it('keeps a merged group when only its name is cleared', () => {
    const g = rename(merge([], 'A', 'B'), 'A', null);
    expect(g).toHaveLength(1);
    expect(g[0]?.name).toBeNull();
  });

  it('survives a round trip through stored rows', () => {
    const groups = [...rename(merge([], 'A', 'B'), 'A', 'Nice'), { keys: ['Z'], name: 'Only' }];
    let n = 0;
    expect(groupsFromRows(rowsFromGroups(groups, () => `g${n++}`))).toEqual(groups);
  });
});
