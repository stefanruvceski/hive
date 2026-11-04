import { emptyReceipt } from './fiscal-parse';
import { outcome } from './receipt-sync';

const body = JSON.stringify({
  invoiceRequest: { businessName: 'Maxi', locationName: 'Maxi 12' },
  invoiceResult: { totalAmount: 100, sdcTime: '2026-10-25T12:03:11Z' },
});

describe('receipt sync outcome', () => {
  it('stays pending offline and when the office is down', () => {
    expect(outcome(emptyReceipt, { kind: 'offline' })).toEqual({ kind: 'retry' });
    expect(outcome(emptyReceipt, { kind: 'http', code: 503 })).toEqual({ kind: 'retry' });
    expect(outcome(emptyReceipt, { kind: 'http', code: 429 })).toEqual({ kind: 'retry' });
  });

  it('fails an unknown receipt with a message that says how to retry', () => {
    const result = outcome(emptyReceipt, { kind: 'http', code: 404 });
    expect(result).toMatchObject({ kind: 'save', data: { status: 'failed' } });
    expect(result.kind === 'save' && result.data.error).toMatch(/Pull down to try again/);
  });

  it('fails an answer that holds no receipt', () => {
    const result = outcome(emptyReceipt, { kind: 'body', text: '<html>Not found</html>' });
    expect(result).toMatchObject({ kind: 'save', data: { status: 'failed' } });
  });

  it('saves a receipt it could read', () => {
    const result = outcome(emptyReceipt, { kind: 'body', text: body });
    expect(result).toMatchObject({
      kind: 'save',
      data: { status: 'ok', shop: 'Maxi 12', total: 100 },
    });
  });
});
