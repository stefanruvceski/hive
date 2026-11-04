import { sortCards } from './card-order';

const card = (
  id: string,
  over: { pinned?: boolean; lastUsed?: number | null; addedAt: number },
) => ({
  id,
  pinned: false,
  lastUsed: null,
  ...over,
});

// Ported from hive-poc CardOrder.kt: pinned first, then the last used, then the newest.
describe('card order', () => {
  it('puts pinned first, then last used, then newest', () => {
    const cards = [
      card('new-unused', { addedAt: 300 }),
      card('old-unused', { addedAt: 100 }),
      card('used-recently', { addedAt: 50, lastUsed: 900 }),
      card('used-long-ago', { addedAt: 60, lastUsed: 400 }),
      card('pinned', { addedAt: 10, pinned: true }),
    ];
    expect(sortCards(cards).map((c) => c.id)).toEqual([
      'pinned',
      'used-recently',
      'used-long-ago',
      'new-unused',
      'old-unused',
    ]);
  });

  it('does not change the input', () => {
    const cards = [card('a', { addedAt: 1 }), card('b', { addedAt: 2 })];
    sortCards(cards);
    expect(cards.map((c) => c.id)).toEqual(['a', 'b']);
  });
});
