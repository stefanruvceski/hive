// Pure Habits logic: no React, no database. Tested directly in habits.test.ts.

import type { Goal } from './goal';
import type { Schedule } from './schedule';
import type { TimeOfDay } from '../data/schema';

/** `color` is a `HabitColors` key; left out = automatic. */
/** `schedule` and `goal` are left out for a daily yes/no habit. */
export type NewHabit = {
  name: string;
  emoji: string;
  timeOfDay: TimeOfDay;
  color?: string;
  schedule?: Schedule;
  goal?: Goal;
};

/** The parts of the day in list order, with their labels. */
export const timeOfDayOptions: readonly { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
];

/** The fixed emoji grid on the Add habit form (decided at checkpoint A of #6). */
export const habitEmojis: readonly string[] = [
  '🎯',
  '💧',
  '📚',
  '🏃',
  '🧘',
  '🛏️',
  '🥗',
  '💊',
  '🦷',
  '🚶',
  '🏋️',
  '🚴',
  '✍️',
  '🎸',
  '🧠',
  '🌱',
  '☀️',
  '🌙',
  '📵',
  '🧹',
  '💰',
  '📞',
  '🙏',
  '❤️',
];

/** More emojis after the first 24, shown further along the scrolling row on the form. */
export const extraHabitEmojis: readonly string[] = [
  '🍎',
  '🥦',
  '🍳',
  '🥛',
  '☕',
  '🍵',
  '🥤',
  '🚿',
  '🛁',
  '🧼',
  '🪥',
  '🧴',
  '🩺',
  '🫁',
  '💪',
  '🧗',
  '🏊',
  '🤸',
  '🥾',
  '🚲',
  '🏔️',
  '🌿',
  '🌳',
  '🐕',
  '🐈',
  '🎨',
  '🎹',
  '🎧',
  '📖',
  '📝',
  '💻',
  '📱',
  '⏰',
  '🗓️',
  '🧩',
  '♟️',
  '🎮',
  '🎓',
  '💡',
  '🔥',
  '🏆',
  '🎉',
  '🌅',
  '🌃',
  '❄️',
  '🌧️',
  '🏠',
  '🚗',
  '🛒',
  '💸',
  '🪙',
  '🤝',
  '😊',
  '😌',
  '😴',
  '🧘‍♀️',
];

/** Every emoji the form offers, in order; the first 24 are `habitEmojis`. */
export const allHabitEmojis: readonly string[] = [...habitEmojis, ...extraHabitEmojis];

export const defaultEmoji = '🎯';

/** Trimmed name; empty when the input is blank. */
export function normalizeName(name: string): string {
  return name.trim();
}

/** A habit can be saved once its name is more than spaces. */
export function canSave(name: string): boolean {
  return normalizeName(name).length > 0;
}

/** Groups habits by part of the day, in list order, skipping parts without habits. */
export function groupByTimeOfDay<H extends { timeOfDay: TimeOfDay; position: number }>(
  habits: readonly H[],
): { timeOfDay: TimeOfDay; label: string; habits: H[] }[] {
  const sorted = [...habits].sort((a, b) => a.position - b.position);
  return timeOfDayOptions
    .map(({ value, label }) => ({
      timeOfDay: value,
      label,
      habits: sorted.filter((habit) => habit.timeOfDay === value),
    }))
    .filter((group) => group.habits.length > 0);
}

/** A unique id for a new habit (no crypto dependency: time + randomness). */
export function newHabitId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Which of `count` palette colors a habit gets: from its id, so it never changes when habits move. */
export function habitColorIndex(id: string, count: number): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % count;
}

const isRegionalIndicator = (code: number) => code >= 0x1f1e6 && code <= 0x1f1ff;
const isModifier = (code: number) =>
  code === 0xfe0f || code === 0xfe0e || code === 0x20e3 || (code >= 0x1f3fb && code <= 0x1f3ff);

/**
 * The first emoji (or character) of what was typed, whole: a flag, a skin tone, a variation
 * selector or a joined family stays together. Empty for blank text.
 */
export function firstGrapheme(text: string): string {
  const chars = Array.from(text.trim());
  const first = chars[0];
  if (!first) return '';
  let end = 1;
  const code = (index: number) => chars[index]?.codePointAt(0) ?? -1;
  if (isRegionalIndicator(code(0)) && isRegionalIndicator(code(1))) end = 2;
  for (;;) {
    if (isModifier(code(end))) end += 1;
    else if (code(end) === 0x200d && code(end + 1) !== -1) end += 2;
    else break;
  }
  return chars.slice(0, end).join('');
}
