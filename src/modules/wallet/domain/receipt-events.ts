import type { ReceiptEventItem, ReceiptPayloadV1 } from '@/lib/events/types';

import { cleanItemName, type ReceiptItemData } from './fiscal-parse';

/** Dinars (major units, as the tax office writes them) as para. */
export const toMinor = (value: number) => Math.round(value * 100);

export type StoredItem = {
  name: string;
  quantity: number;
  /** Para. */
  unitPrice: number;
  /** Para. */
  total: number;
  unit: string | null;
  vat: string | null;
};

export const toStoredItem = (i: ReceiptItemData): StoredItem => ({
  name: i.name,
  quantity: i.quantity,
  unitPrice: toMinor(i.unitPrice),
  total: toMinor(i.total),
  unit: i.unit,
  vat: i.vat,
});

/** A corrected price or quantity: the line total follows. */
export const repriced = (item: StoredItem, quantity: number, unitPrice: number): StoredItem => ({
  ...item,
  quantity,
  unitPrice,
  total: Math.round(quantity * unitPrice),
});

type EventReceipt = {
  id: string;
  sourceKey: string;
  shop: string | null;
  company: string | null;
  buyerTin: string | null;
  tin: string | null;
  refund: boolean;
  total: number | null;
  time: string | null;
  addedAt: number;
};

/** What other modules get to know about a receipt (ADR 0003). */
export function receiptPayload(r: EventReceipt, items: readonly StoredItem[]): ReceiptPayloadV1 {
  return {
    version: 1,
    receiptId: r.id,
    sourceRef: r.sourceKey,
    shop: r.shop ?? r.company ?? 'Receipt',
    pib: r.buyerTin,
    total: r.total ?? 0,
    currency: 'RSD',
    // Belgrade local time as printed; a scan whose time is unknown falls back to when it was scanned.
    issuedAt: r.time ?? new Date(r.addedAt).toISOString().slice(0, 19),
    shopPib: r.tin?.trim() || null,
    company: r.company,
    refund: r.refund || (r.total ?? 0) < 0,
    items: items.map((i, line): ReceiptEventItem => ({
      line,
      name: cleanItemName(i.name),
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
      vatLabel: i.vat,
    })),
  };
}

/** A PIB is nine digits. */
export const isPib = (value: string) => /^\d{9}$/.test(value.trim());
