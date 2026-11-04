import { useSyncExternalStore } from 'react';

import type { WalletCard } from './queries';

// The card that was just deleted, kept so the list can offer Undo after the card screen closed.
let deleted: WalletCard | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const rememberDeletedCard = (card: WalletCard | null) => {
  deleted = card;
  emit();
};
export const useDeletedCard = () =>
  useSyncExternalStore(
    subscribe,
    () => deleted,
    () => null,
  );
