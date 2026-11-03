import { toIsoDate } from '@/utils/format-date';

/** Longest note kept with a day's entry. */
export const noteLimit = 200;

/** How many days before today the read-only history reaches. */
export const historyDays = 30;

export type MoodEntry = {
  /** Local ISO date (`YYYY-MM-DD`). */
  date: string;
  mood: number;
  motivation: number;
  note: string | null;
  updatedAt: string;
};

export type MoodFace = { value: number; emoji: string; label: string };

/** Mood 1 (worst) to 5 (best), drawn as faces. */
export const moodFaces: readonly MoodFace[] = [
  { value: 1, emoji: '😞', label: 'Very low' },
  { value: 2, emoji: '🙁', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

const isRating = (value: number | null): value is number =>
  value !== null && Number.isInteger(value) && value >= 1 && value <= 5;

/** Both ratings are required to save. */
export function canSaveMood(draft: { mood: number | null; motivation: number | null }): boolean {
  return isRating(draft.mood) && isRating(draft.motivation);
}

/** Trims the note; blank means no note. Cut to `noteLimit`. */
export function normalizeNote(note: string): string | null {
  const trimmed = note.trim().slice(0, noteLimit);
  return trimmed === '' ? null : trimmed;
}

/** Entries of the last `historyDays` days before `today`, newest first. Today is the form's. */
export function recentEntries(entries: readonly MoodEntry[], today: string): MoodEntry[] {
  const start = new Date(`${today}T00:00:00`);
  start.setDate(start.getDate() - historyDays);
  const oldest = toIsoDate(start);
  return entries
    .filter((entry) => entry.date >= oldest && entry.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** The list with `next` in place of the entry of the same day (or added), oldest first. */
export function upsertEntry(entries: readonly MoodEntry[], next: MoodEntry): MoodEntry[] {
  return [...entries.filter((entry) => entry.date !== next.date), next].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
