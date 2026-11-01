// Pure Habits logic: no React, no database. Tested directly in habits.test.ts.

import type { TimeOfDay } from '../data/schema';

export type NewHabit = { name: string; emoji: string; timeOfDay: TimeOfDay };

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

/** `YYYY-MM-DD` in the phone's time zone. */
export function toLocalIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A unique id for a new habit (no crypto dependency: time + randomness). */
export function newHabitId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
