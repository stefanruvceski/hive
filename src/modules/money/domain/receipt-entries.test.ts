import type { HiveEvent, ReceiptPayloadV1 } from '@/lib/events';

import {
  categoryNameFor,
  categoryNameForEntry,
  planEvent,
  type ReceiptEntry,
  reconcile,
  receiptIdOf,
  sourceRefOf,
} from './receipt-entries';

const payload = (over: Partial<ReceiptPayloadV1> = {}): ReceiptPayloadV1 => ({
  version: 1,
  receiptId: 'r1',
  sourceRef: 'vl-1',
  shop: 'Maxi 12',
  pib: null,
  total: 30000,
  currency: 'RSD',
  issuedAt: '2026-10-25T14:03:11',
  items: [
    { name: 'MLEKO', quantity: 2, unitPrice: 10000, total: 20000, vatLabel: 'Ђ' },
    { name: 'HLEB', quantity: 1, unitPrice: 10000, total: 10000, vatLabel: null },
  ],
  ...over,
});
const scanned = (p: ReceiptPayloadV1): HiveEvent => ({ type: 'receipt.scanned', payload: p });

describe('receipt entries', () => {
  it('makes one expense per item, dated by the receipt, with the shop as note', () => {
    const plan = planEvent(scanned(payload()));
    expect(plan).toEqual({
      receiptId: 'r1',
      entries: [
        {
          sourceRef: 'wallet:r1:0',
          amountMinor: 20000,
          date: '2026-10-25',
          note: 'Maxi 12',
          pib: null,
          shop: 'Maxi 12',
          name: 'MLEKO',
          shopPib: null,
          company: null,
        },
        {
          sourceRef: 'wallet:r1:1',
          amountMinor: 10000,
          date: '2026-10-25',
          note: 'Maxi 12',
          pib: null,
          shop: 'Maxi 12',
          name: 'HLEB',
          shopPib: null,
          company: null,
        },
      ],
    });
  });

  it('keeps the business PIB of a company receipt', () => {
    const plan = planEvent(scanned(payload({ pib: '123456789' })));
    expect(plan.entries.every((e) => e.pib === '123456789')).toBe(true);
  });

  it('turns a refund into negative expenses, whichever sign the lines carry', () => {
    const plan = planEvent(
      scanned(
        payload({
          total: -10000,
          items: [{ name: 'MLEKO', quantity: 1, unitPrice: 10000, total: 10000, vatLabel: null }],
        }),
      ),
    );
    expect(plan.entries.map((e) => e.amountMinor)).toEqual([-10000]);
    const negative = planEvent(
      scanned(
        payload({
          total: -10000,
          items: [{ name: 'MLEKO', quantity: -1, unitPrice: 10000, total: -10000, vatLabel: null }],
        }),
      ),
    );
    expect(negative.entries.map((e) => e.amountMinor)).toEqual([-10000]);
  });

  it('plans a delete as no entries', () => {
    const plan = planEvent({
      type: 'receipt.deleted',
      payload: { version: 1, receiptId: 'r1', sourceRef: 'vl-1' },
    });
    expect(plan).toEqual({ receiptId: 'r1', entries: [] });
  });

  it('reconciles an update: changed, added and removed lines', () => {
    const before = planEvent(scanned(payload())).entries;
    const existing = before.map((e, i) => ({ id: `id${i}`, sourceRef: e.sourceRef }));
    const after = planEvent(
      scanned(
        payload({
          items: [
            { name: 'MLEKO', quantity: 2, unitPrice: 11000, total: 22000, vatLabel: null },
            { name: 'SIR', quantity: 1, unitPrice: 5000, total: 5000, vatLabel: null },
            { name: 'JAJA', quantity: 1, unitPrice: 4000, total: 4000, vatLabel: null },
          ],
        }),
      ),
    ).entries;
    const diff = reconcile(existing, after);
    expect(diff.upsert.map((e: ReceiptEntry) => e.sourceRef)).toEqual([
      'wallet:r1:0',
      'wallet:r1:1',
      'wallet:r1:2',
    ]);
    expect(diff.remove).toEqual([]);
    const fewer = reconcile(existing, after.slice(0, 1));
    expect(fewer.remove).toEqual(['id1']);
  });

  it('parses the receipt id back from a source ref', () => {
    expect(sourceRefOf('r1', 3)).toBe('wallet:r1:3');
    expect(receiptIdOf('wallet:r1-a_b:3')).toBe('r1-a_b');
    expect(receiptIdOf('other:x:1')).toBeNull();
    expect(receiptIdOf(null)).toBeNull();
  });

  it('files known chains under a category and everything else under Other', () => {
    expect(categoryNameFor('NIS', 'private')).toBe('Transport');
    expect(categoryNameFor('Lukoil BS 12', 'business')).toBe('Fuel');
    expect(categoryNameFor('Maxi 12', 'private')).toBe('Food');
    expect(categoryNameFor('Idea Centar', 'business')).toBe('Supplies');
    expect(categoryNameFor('Pekara Kod Mike', 'private')).toBe('Other');
  });
});

describe('category of a receipt line', () => {
  const line = (over: Partial<ReceiptEntry> = {}) => ({
    shop: '1206824-BS Ruma 1',
    shopPib: null,
    company: null,
    name: 'EVRO PREMIJUM BMB-95',
    ...over,
  });

  it('puts fuel from a branch name Money does not know into Fuel, by the item', () => {
    expect(categoryNameForEntry(line(), 'business')).toBe('Fuel');
    expect(categoryNameForEntry(line({ name: 'EVRO PREMIJUM' }), 'private')).toBe('Transport');
    expect(categoryNameForEntry(line({ name: 'Kafa' }), 'private')).toBe('Other');
  });

  it('goes by the shop PIB first, whatever the line is called', () => {
    expect(categoryNameForEntry(line({ shopPib: '104052135', name: 'Kafa' }), 'business')).toBe(
      'Fuel',
    );
  });

  it('goes by the company name when the branch tells nothing', () => {
    expect(
      categoryNameForEntry(line({ company: 'Lidl Srbija KD', name: 'Mleko' }), 'private'),
    ).toBe('Food');
  });

  it('treats a refund flag like a negative total, and older events without it too', () => {
    const entries = (p: Partial<ReceiptPayloadV1>) =>
      planEvent(scanned(payload({ total: 30000, ...p }))).entries.map((e) => e.amountMinor);
    expect(entries({ refund: true })).toEqual([-20000, -10000]);
    expect(entries({ total: -30000 })).toEqual([-20000, -10000]);
    expect(entries({})).toEqual([20000, 10000]);
  });

  it('carries the new payload fields into the entry, null for older events', () => {
    const [e] = planEvent(scanned(payload({ shopPib: '104052135', company: 'NIS a.d.' }))).entries;
    expect(e).toMatchObject({ shopPib: '104052135', company: 'NIS a.d.' });
  });
});
