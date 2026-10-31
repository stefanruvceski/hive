import { arrangeModules, moveCard, toggleHidden, toLayoutRows } from './home-layout';

const habits = { id: 'habits' };
const health = { id: 'health' };
const money = { id: 'money' };

describe('home layout', () => {
  it('uses registry order until the user customises it', () => {
    expect(arrangeModules([habits, health], []).map((c) => c.module.id)).toEqual([
      'habits',
      'health',
    ]);
  });

  it('applies stored order and visibility, appends new modules, ignores removed ones', () => {
    const rows = [
      { moduleId: 'health', position: 0, hidden: false },
      { moduleId: 'habits', position: 1, hidden: true },
      { moduleId: 'removed', position: 2, hidden: false },
    ];

    expect(arrangeModules([habits, health, money], rows)).toEqual([
      { module: health, hidden: false },
      { module: habits, hidden: true },
      { module: money, hidden: false },
    ]);
  });

  it('moves, hides and serialises cards', () => {
    const cards = arrangeModules([habits, health, money], []);

    const moved = moveCard(cards, 2, -1);
    expect(moved.map((c) => c.module.id)).toEqual(['habits', 'money', 'health']);
    expect(moveCard(cards, 0, -1)).toEqual(cards);

    const hidden = toggleHidden(moved, 0);
    expect(toLayoutRows(hidden)).toEqual([
      { moduleId: 'habits', position: 0, hidden: true },
      { moduleId: 'money', position: 1, hidden: false },
      { moduleId: 'health', position: 2, hidden: false },
    ]);
  });
});
