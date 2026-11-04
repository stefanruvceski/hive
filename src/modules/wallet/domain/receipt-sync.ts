import { parseReceipt, type ReceiptData } from './fiscal-parse';

export type FiscalAnswer =
  { kind: 'body'; text: string } | { kind: 'http'; code: number } | { kind: 'offline' };

/** What to do with a receipt after asking the tax office. */
export type SyncOutcome =
  /** Read: save this. */
  | { kind: 'save'; data: ReceiptData }
  /** The office could not be reached or is down: stay as it was and retry later. */
  | { kind: 'retry' };

const retryable = ' Pull down to try again.';

/** Offline and server errors keep a receipt Pending; an unknown or unreadable receipt becomes Failed. */
export function outcome(base: ReceiptData, answer: FiscalAnswer): SyncOutcome {
  if (answer.kind === 'offline') return { kind: 'retry' };
  if (answer.kind === 'http') {
    if (answer.code >= 500 || answer.code === 429 || answer.code === 408) return { kind: 'retry' };
    return {
      kind: 'save',
      data: {
        ...base,
        status: 'failed',
        error: `The tax office doesn't know this receipt.${retryable}`,
      },
    };
  }
  const parsed = parseReceipt(base, answer.text);
  if (parsed === null) {
    return {
      kind: 'save',
      data: { ...base, status: 'failed', error: `Couldn't read this receipt.${retryable}` },
    };
  }
  return {
    kind: 'save',
    data:
      parsed.status === 'failed'
        ? { ...parsed, error: `${parsed.error ?? ''}${retryable}` }
        : parsed,
  };
}
