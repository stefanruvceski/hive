import { HabitColors } from '@/constants/theme';

/** Card colors are the shared palette in the theme; a card stores the key. */
export const cardColorKeys = HabitColors.map((c) => c.key);
export type CardColorKey = (typeof HabitColors)[number]['key'];
export const defaultCardColor: CardColorKey = 'blue';

export function cardColor(key: string, scheme: 'light' | 'dark'): string {
  const found = HabitColors.find((c) => c.key === key) ?? HabitColors[1];
  return found[scheme];
}
