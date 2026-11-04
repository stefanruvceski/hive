import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { walletCards } from './schema';
import { sortCards } from '../domain/card-order';
import { newId } from '../domain/ids';

export type WalletCard = typeof walletCards.$inferSelect;

// Hierarchical key factory — every key for this module comes from here (07 §1).
export const walletKeys = {
  all: ['wallet'] as const,
  cards: () => [...walletKeys.all, 'cards'] as const,
  card: (id: string) => [...walletKeys.all, 'card', id] as const,
};

/** All cards, pinned first, then last used, then newest. */
export const cardsQuery = () =>
  queryOptions({
    queryKey: walletKeys.cards(),
    queryFn: async (): Promise<WalletCard[]> => sortCards(getDb().select().from(walletCards).all()),
  });

export const cardQuery = (id: string) =>
  queryOptions({
    queryKey: walletKeys.card(id),
    queryFn: async (): Promise<WalletCard | null> =>
      getDb().select().from(walletCards).where(eq(walletCards.id, id)).get() ?? null,
  });

export function useCards() {
  return useQuery(cardsQuery());
}

export function useCard(id: string) {
  return useQuery(cardQuery(id));
}

export type CardDraft = {
  name: string;
  number: string;
  format: string;
  color: string;
  note: string;
};

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: CardDraft): Promise<string> => {
      const id = newId();
      getDb()
        .insert(walletCards)
        .values({
          id,
          name: draft.name.trim(),
          number: draft.number.trim(),
          format: draft.format,
          color: draft.color,
          note: draft.note.trim(),
          addedAt: Date.now(),
        })
        .run();
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  });
}

/** Opening a card counts as a use: it moves up the list. */
export function useOpenCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      getDb()
        .update(walletCards)
        .set({ lastUsed: Date.now(), uses: sql`${walletCards.uses} + 1` })
        .where(eq(walletCards.id, id))
        .run();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  });
}

export function usePinCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }): Promise<void> => {
      getDb().update(walletCards).set({ pinned }).where(eq(walletCards.id, id)).run();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  });
}

/** Deletes the card and hands the row back so the caller can offer Undo. */
export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<WalletCard | null> => {
      const db = getDb();
      const row = db.select().from(walletCards).where(eq(walletCards.id, id)).get() ?? null;
      db.delete(walletCards).where(eq(walletCards.id, id)).run();
      return row;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  });
}

/** Undo of a delete: puts the very same row back. */
export function useRestoreCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: WalletCard): Promise<void> => {
      getDb().insert(walletCards).values(row).onConflictDoNothing().run();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  });
}
