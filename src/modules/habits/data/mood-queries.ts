import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { desc } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { habitsMood } from './schema';
import { canSaveMood, type MoodEntry, normalizeNote, upsertEntry } from '../domain/mood';

// Hierarchical key factory — every key for this feature comes from here (07 §1).
export const moodKeys = {
  all: ['habits', 'mood'] as const,
  entries: () => [...moodKeys.all, 'entries'] as const,
};

/** Every mood entry, newest first; the screen picks today's and the last 30 days. */
export const moodEntriesQuery = () =>
  queryOptions({
    queryKey: moodKeys.entries(),
    queryFn: async (): Promise<MoodEntry[]> =>
      getDb().select().from(habitsMood).orderBy(desc(habitsMood.date)).all(),
  });

export function useMoodEntries() {
  return useQuery(moodEntriesQuery());
}

export type MoodDraft = { date: string; mood: number; motivation: number; note: string };

/** Creates or updates the entry of `date`. Optimistic; the form shows `isError` and can retry. */
export function useSaveMood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: MoodDraft) => {
      if (!canSaveMood(draft)) throw new Error('Mood and motivation are required.');
      const values = {
        mood: draft.mood,
        motivation: draft.motivation,
        note: normalizeNote(draft.note),
        updatedAt: new Date().toISOString(),
      };
      getDb()
        .insert(habitsMood)
        .values({ date: draft.date, ...values })
        .onConflictDoUpdate({ target: habitsMood.date, set: values })
        .run();
    },
    onMutate: async (draft) => {
      await queryClient.cancelQueries({ queryKey: moodKeys.entries() });
      const previous = queryClient.getQueryData<MoodEntry[]>(moodKeys.entries());
      if (previous) {
        const next: MoodEntry = {
          date: draft.date,
          mood: draft.mood,
          motivation: draft.motivation,
          note: normalizeNote(draft.note),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData(moodKeys.entries(), upsertEntry(previous, next).reverse());
      }
      return { previous };
    },
    onError: (_error, _draft, context) => {
      queryClient.setQueryData(moodKeys.entries(), context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: moodKeys.entries() }),
  });
}
