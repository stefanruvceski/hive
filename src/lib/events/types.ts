// Shared event contract between modules (ADR 0003). Pure types and parsing: no database, no React.

/** One line of a receipt, amounts in minor units (para). */
export type ReceiptEventItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  vatLabel: string | null;
};

/** The receipt as a consumer needs it. `version` is part of the payload (ADR 0003 §6). */
export type ReceiptPayloadV1 = {
  version: 1;
  receiptId: string;
  /** Stable key of the receipt (the `vl` of its link); a consumer's `source_ref`. */
  sourceRef: string;
  shop: string;
  /** Owner PIB; null = personal. */
  pib: string | null;
  /** Negative for a refund. */
  total: number;
  currency: string;
  /** ISO timestamp the receipt was issued. */
  issuedAt: string;
  items: ReceiptEventItem[];
};

export type ReceiptDeletedPayloadV1 = { version: 1; receiptId: string; sourceRef: string };

export type HiveEvent =
  | { type: 'receipt.scanned'; payload: ReceiptPayloadV1 }
  | { type: 'receipt.updated'; payload: ReceiptPayloadV1 }
  | { type: 'receipt.deleted'; payload: ReceiptDeletedPayloadV1 };

export type HiveEventType = HiveEvent['type'];

export type StoredEvent = {
  id: number;
  type: string;
  version: number;
  payload: unknown;
  createdAt: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A stored row as a known event, or null for an unknown type/version (consumers skip those). */
export function parseEvent(stored: StoredEvent): HiveEvent | null {
  const { payload } = stored;
  if (!isRecord(payload) || payload.version !== 1 || stored.version !== 1) return null;
  switch (stored.type) {
    case 'receipt.scanned':
    case 'receipt.updated':
      return { type: stored.type, payload: payload as ReceiptPayloadV1 };
    case 'receipt.deleted':
      return { type: 'receipt.deleted', payload: payload as ReceiptDeletedPayloadV1 };
    default:
      return null;
  }
}
