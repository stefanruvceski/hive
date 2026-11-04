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

export const receipt = (
  id: string,
  over: Partial<import('../data/receipt-queries').Receipt> = {},
): import('../data/receipt-queries').Receipt => ({
  id,
  url: `https://suf.purs.gov.rs/v/?vl=${id}`,
  sourceKey: id,
  status: 'ok',
  company: 'Maxi d.o.o.',
  shop: 'Maxi 12',
  address: 'Bulevar 1',
  city: 'Beograd',
  tin: '100000001',
  total: 837998,
  time: '2026-10-25T14:03:11',
  invoiceNumber: 'AB-1',
  refund: false,
  payment: 'Card',
  journal: 'ПИБ: 100000001',
  note: '',
  error: null,
  addedAt: 1,
  buyerTin: null,
  ownerManual: false,
  starred: false,
  items: [
    {
      id: `${id}-i1`,
      receiptId: id,
      position: 0,
      name: 'EVRO DIZEL',
      quantity: 40,
      unitPrice: 20500,
      total: 820000,
      unit: 'L',
      vat: 'Ђ',
    },
  ],
  ...over,
});
