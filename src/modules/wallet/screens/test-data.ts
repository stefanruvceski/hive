import type { WalletCard } from '../data/queries';
import { defaultCardColor } from '../domain/card-colors';

export const card = (id: string, over: Partial<WalletCard> = {}): WalletCard => ({
  id,
  name: `Card ${id}`,
  number: '4006381333931',
  format: 'EAN_13',
  color: defaultCardColor,
  note: '',
  addedAt: 1,
  lastUsed: null,
  uses: 0,
  pinned: false,
  ...over,
});

/** A hook result that is neither loading nor failed. */
export const loaded = <T>(data: T) => ({ data }) as never;
