import { isPib, receiptPayload, repriced, toMinor, toStoredItem } from './receipt-events';

describe('receipt events', () => {
  it('turns dinars into para without float drift', () => {
    expect(toMinor(8379.98)).toBe(837998);
    expect(toMinor(-179.98)).toBe(-17998);
    expect(toMinor(0.1 + 0.2)).toBe(30);
  });

  it('stores an item in para', () => {
    expect(
      toStoredItem({
        name: 'Voda',
        quantity: 2,
        unitPrice: 89.99,
        total: 179.98,
        unit: 'KOM',
        vat: 'Ђ',
      }),
    ).toEqual({ name: 'Voda', quantity: 2, unitPrice: 8999, total: 17998, unit: 'KOM', vat: 'Ђ' });
  });

  it('follows a corrected price or quantity with the line total', () => {
    const item = {
      name: 'Gorivo',
      quantity: 40,
      unitPrice: 20500,
      total: 820000,
      unit: 'L',
      vat: null,
    };
    expect(repriced(item, 38.5, 20500)).toMatchObject({ quantity: 38.5, total: 789250 });
  });

  it('builds the payload other modules read', () => {
    const payload = receiptPayload(
      {
        id: 'r1',
        sourceKey: 'A1b+==',
        shop: 'BS Beograd 5',
        company: 'NIS a.d.',
        buyerTin: '104052135',
        total: 837998,
        time: '2026-10-25T14:03:11',
        addedAt: 0,
      },
      [{ name: 'Gorivo', quantity: 40, unitPrice: 20500, total: 820000, unit: 'L', vat: 'Ђ' }],
    );
    expect(payload).toEqual({
      version: 1,
      receiptId: 'r1',
      sourceRef: 'A1b+==',
      shop: 'BS Beograd 5',
      pib: '104052135',
      total: 837998,
      currency: 'RSD',
      issuedAt: '2026-10-25T14:03:11',
      items: [{ name: 'Gorivo', quantity: 40, unitPrice: 20500, total: 820000, vatLabel: 'Ђ' }],
    });
  });

  it('checks a PIB has nine digits', () => {
    expect(isPib('104052135')).toBe(true);
    expect(isPib('1234')).toBe(false);
    expect(isPib('10405213a')).toBe(false);
  });
});
