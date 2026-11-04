// The only place in Wallet that calls the network: the tax office (suf.purs.gov.rs, public, no key).
import { ApiError, publicText } from '@/lib/api';

import type { FiscalAnswer } from '../domain/receipt-sync';

/** Asks the tax office for a receipt by its QR link; never throws. Parsing is in the domain. */
export async function fetchFiscal(url: string): Promise<FiscalAnswer> {
  try {
    return { kind: 'body', text: await publicText(url, 30_000) };
  } catch (error) {
    return error instanceof ApiError ? { kind: 'http', code: error.status } : { kind: 'offline' };
  }
}
