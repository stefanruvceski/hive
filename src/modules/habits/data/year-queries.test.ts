import { habitsKeys } from './queries';
import { habitsYearQuery } from './year-queries';

jest.mock('@/lib/db/client', () => ({ getDb: jest.fn() }));

describe('habitsYearQuery', () => {
  it('is refreshed whenever completions change', () => {
    const key = habitsYearQuery(2026).queryKey;

    expect(key.slice(0, habitsKeys.completions().length)).toEqual(habitsKeys.completions());
    expect(key).toContain(2026);
  });
});
