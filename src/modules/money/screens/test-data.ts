// Fixtures shared by the Money screen tests.
import type { Category, Entry } from '../data/queries';

export const category = (id: string, extra: Partial<Category> = {}) =>
  ({
    id,
    space: 'private',
    kind: 'expense',
    name: id,
    emoji: '🛒',
    position: 0,
    archivedAt: null,
    ...extra,
  }) as Category;

export const entry = (id: string, extra: Partial<Entry> = {}) =>
  ({
    id,
    space: 'private',
    kind: 'expense',
    amountMinor: 10000,
    currency: 'RSD',
    rate: 1,
    amountRsdMinor: 10000,
    categoryId: 'food',
    date: '2026-11-02',
    note: '',
    pairId: null,
    recurringId: null,
    createdAt: '2026-11-02T10:00:00Z',
    ...extra,
  }) as Entry;

/** A query result that has its data. */
export const loaded = (data: unknown) =>
  ({ data, isError: false, error: null, refetch: jest.fn() }) as never;

export const pending = () =>
  ({ data: undefined, isError: false, error: null, refetch: jest.fn() }) as never;

export const failed = (refetch = jest.fn()) =>
  ({ data: undefined, isError: true, error: new Error('boom'), refetch }) as never;

export const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
