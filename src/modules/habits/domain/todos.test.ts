import {
  editTodo,
  moveTodoTo,
  overdue,
  removeTodo,
  setTodoDone,
  todoCounts,
  todosByTimeOfDay,
  todosFor,
  type Todo,
} from './todos';

const todo = (id: string, extra: Partial<Todo> = {}): Todo => ({
  id,
  title: id,
  date: '2026-11-03',
  timeOfDay: 'anytime',
  done: false,
  doneAt: null,
  position: 0,
  createdAt: '2026-11-03',
  ...extra,
});

describe('todosFor', () => {
  it('lists the day in order', () => {
    const list = [
      todo('c', { position: 2 }),
      todo('a', { position: 0 }),
      todo('other-day', { date: '2026-11-04' }),
      todo('b', { position: 1 }),
    ];
    expect(todosFor(list, '2026-11-03').map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('overdue', () => {
  it('lists open to-dos before today, oldest first, and no done or later ones', () => {
    const list = [
      todo('later', { date: '2026-11-05' }),
      todo('today'),
      todo('old', { date: '2026-10-30', position: 1 }),
      todo('older', { date: '2026-10-28' }),
      todo('old-first', { date: '2026-10-30', position: 0 }),
      todo('finished', { date: '2026-10-29', done: true }),
    ];
    expect(overdue(list, '2026-11-03').map((t) => t.id)).toEqual(['older', 'old-first', 'old']);
  });
});

describe('todosByTimeOfDay', () => {
  it('puts each to-do in its part of the day, keeping the order', () => {
    const grouped = todosByTimeOfDay([
      todo('a', { timeOfDay: 'evening' }),
      todo('b', { timeOfDay: 'morning' }),
      todo('c', { timeOfDay: 'evening' }),
    ]);
    expect(grouped.get('evening')?.map((t) => t.id)).toEqual(['a', 'c']);
    expect(grouped.get('morning')?.map((t) => t.id)).toEqual(['b']);
    expect(grouped.get('afternoon')).toBeUndefined();
  });
});

describe('todoCounts', () => {
  it('counts the done and all of the day', () => {
    const list = [
      todo('a', { done: true }),
      todo('b'),
      todo('c', { done: true, date: '2026-11-04' }),
    ];
    expect(todoCounts(list, '2026-11-03')).toEqual({ done: 1, total: 2 });
    expect(todoCounts([], '2026-11-03')).toEqual({ done: 0, total: 0 });
  });
});

describe('optimistic changes', () => {
  const list = [todo('a'), todo('b')];

  it('marks a to-do done with the time, and open again without it', () => {
    const done = setTodoDone(list, 'a', true, '2026-11-03T10:00:00.000Z');
    expect(done[0]).toMatchObject({ done: true, doneAt: '2026-11-03T10:00:00.000Z' });
    expect(setTodoDone(done, 'a', false, 'x')[0]).toMatchObject({ done: false, doneAt: null });
    expect(done[1]).toBe(list[1]);
  });

  it('moves a to-do to another day, and removes one', () => {
    expect(moveTodoTo(list, 'a', '2026-11-09')[0]?.date).toBe('2026-11-09');
    expect(removeTodo(list, 'a').map((t) => t.id)).toEqual(['b']);
  });

  it('renames a to-do, trimmed, and moves it to another part of the day', () => {
    const edited = editTodo(list, 'a', { title: '  Call mom ', timeOfDay: 'evening' });
    expect(edited[0]).toMatchObject({ title: 'Call mom', timeOfDay: 'evening' });
    expect(edited[1]).toBe(list[1]);
  });
});
