// Pure Habits logic: the ready-made habits offered on first open. Tested in suggestions.test.ts.

import type { NewHabit } from './habits';

export type Suggestion = NewHabit & { id: string };

/** A few everyday habits; each one is a plain daily yes/no habit the user can change later. */
export const starterSuggestions: readonly Suggestion[] = [
  { id: 'water', name: 'Drink water', emoji: '💧', timeOfDay: 'anytime' },
  { id: 'stretch', name: 'Stretch', emoji: '🧘', timeOfDay: 'morning' },
  { id: 'walk', name: 'Take a walk', emoji: '🚶', timeOfDay: 'afternoon' },
  { id: 'read', name: 'Read', emoji: '📚', timeOfDay: 'evening' },
  { id: 'sleep', name: 'Go to bed on time', emoji: '🛏️', timeOfDay: 'evening' },
];

/** The habits to create for the chosen suggestion ids, in suggestion order. */
export function pickSuggestions(ids: ReadonlySet<string>): NewHabit[] {
  return starterSuggestions
    .filter((suggestion) => ids.has(suggestion.id))
    .map(({ name, emoji, timeOfDay }) => ({ name, emoji, timeOfDay }));
}
