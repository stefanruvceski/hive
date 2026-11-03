import { HabitColors } from '@/constants/theme';

import { habitColor, habitColorOptions } from './habit-color';

describe('habitColorOptions', () => {
  it('has 14 distinct keys and colors per theme', () => {
    expect(habitColorOptions).toHaveLength(14);
    expect(new Set(habitColorOptions.map((option) => option.key)).size).toBe(14);
    expect(new Set(HabitColors.map((color) => color.dark)).size).toBe(14);
    expect(new Set(HabitColors.map((color) => color.light)).size).toBe(14);
  });
});

describe('habitColor', () => {
  it('uses the chosen color in the theme', () => {
    const pink = HabitColors.find(({ key }) => key === 'pink');
    expect(habitColor({ id: 'a', color: 'pink' }, 'dark')).toBe(pink?.dark);
    expect(habitColor({ id: 'a', color: 'pink' }, 'light')).toBe(pink?.light);
  });

  it('falls back to one of the first eight, from the id, when none or an unknown key is stored', () => {
    const firstEight = HabitColors.slice(0, 8).map((color) => color.dark);
    for (const color of [undefined, null, 'gone']) {
      const result = habitColor({ id: 'read', color }, 'dark');
      expect(firstEight).toContain(result);
      expect(result).toBe(habitColor({ id: 'read', color }, 'dark'));
    }
  });
});
