import { useSyncExternalStore } from 'react';

import type { Receipt } from './receipt-queries';

// The receipt that was just deleted, kept so the list can offer Undo after its screen closed.
let deleted: Receipt | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const rememberDeletedReceipt = (receipt: Receipt | null) => {
  deleted = receipt;
  listeners.forEach((listener) => listener());
};
export const useDeletedReceipt = () =>
  useSyncExternalStore(
    subscribe,
    () => deleted,
    () => null,
  );
