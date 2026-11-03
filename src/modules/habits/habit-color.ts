import { HabitColors } from '@/constants/theme';

import { habitColorIndex } from './domain/habits';

/** The colors a habit can be given, in picker order. */
export const habitColorOptions = HabitColors;

/** How many colors a habit without a stored one picks from: the first eight, so it never shifts. */
const automaticCount = 8;

/**
 * A habit's color in the theme: the stored `color` key, or, when none (or an unknown one) is
 * stored, one picked from its id so it stays the same when habits are moved.
 */
export function habitColor(
  habit: { id: string; color?: string | null },
  scheme: 'light' | 'dark',
): string {
  const chosen = HabitColors.find(({ key }) => key === habit.color);
  const color = chosen ?? HabitColors[habitColorIndex(habit.id, automaticCount)] ?? HabitColors[0];
  return color[scheme];
}

/** A `#RRGGBB` color with an opacity of 0–1 (as `#RRGGBBAA`): the partial fill of an amount. */
export function withAlpha(color: string, alpha: number): string {
  return `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}
