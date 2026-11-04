import {
  buyerTinIn,
  companyTin,
  emptyReceipt,
  latin,
  number,
  parseHtml,
  parseJournal,
  parseReceipt,
  receiptKey,
  verificationUrl,
} from './fiscal-parse';

// Ported from hive-poc wallet/.../domain/FiscalParseTest.kt
const base = emptyReceipt;

const fuelJournal = `============ ФИСКАЛНИ РАЧУН ============
ПИБ:                           104052135
Предузеће:              NIS a.d. Novi Sad
Место продаје:          1234 - BS BEOGRAD 5
Адреса:                 Булевар ослобођења 12
Општина:                          Врачар
Касир:                             Петар
ЕСИР број:                       101/2.0
----------- ПРОМЕТ ПРОДАЈА -------------
Артикли
========================================
Назив   Цена         Кол.         Укупно
EVRO DIZEL /L (Ђ)
     205,00     40,000        8.200,00
8600043004223/Вода Росa 1,5л/КОМ (Ђ)
      89,99          2          179,98
----------------------------------------
Укупан износ:                   8.379,98
Платна картица:                 8.379,98
========================================
Ознака       Име      Стопа        Порез
Ђ           О-ПДВ   20,00%      1.396,66
----------------------------------------
Укупан износ пореза:            1.396,66
========================================
ПФР време:          25.10.2026. 14:03:11
ПФР број рачуна: AB12CD34-AB12CD34-5678
Бројач рачуна:             5678/5700ПП
========================================
======== КРАЈ ФИСКАЛНОГ РАЧУНА =========`;

describe('fiscal receipts', () => {
  it('finds the link in scanned text', () => {
    expect(verificationUrl('http://SUF.PURS.GOV.RS/v/?vl=A1b%2B==')).toBe(
      'https://suf.purs.gov.rs/v/?vl=A1b%2B==',
    );
    expect(verificationUrl('Račun: suf.purs.gov.rs/v/?vl=X')).toBe(
      'https://suf.purs.gov.rs/v/?vl=X',
    );
    expect(verificationUrl('https://example.com/v/?vl=X')).toBeNull();
    expect(receiptKey('https://suf.purs.gov.rs/v/?vl=A1b%2B==')).toBe('A1b+==');
  });

  it('reads Serbian numbers', () => {
    expect(number('8.200,00')).toBeCloseTo(8200);
    expect(number('40,000')).toBeCloseTo(40);
    expect(number('2')).toBeCloseTo(2);
    expect(number('-179,98')).toBeCloseTo(-179.98);
    expect(number('abc')).toBeNull();
  });

  it('reads the printed receipt', () => {
    const r = parseJournal(base, fuelJournal);
    expect(r.company).toBe('NIS a.d. Novi Sad');
    expect(r.shop).toBe('1234 - BS BEOGRAD 5');
    expect(r.address).toBe('Bulevar oslobođenja 12');
    expect(r.city).toBe('Vračar');
    expect(r.tin).toBe('104052135');
    expect(r.total).toBeCloseTo(8379.98);
    expect(r.time).toBe('2026-10-25T14:03:11');
    expect(r.invoiceNumber).toBe('AB12CD34-AB12CD34-5678');
    expect(r.payment).toBe('Card');
    expect(r.items).toHaveLength(2);
    const fuel = r.items[0];
    expect(fuel).toEqual({
      name: 'EVRO DIZEL',
      unit: 'L',
      vat: 'Ђ',
      quantity: 40,
      unitPrice: 205,
      total: 8200,
    });
    expect(r.items[1]).toMatchObject({ name: 'Voda Rosa 1,5l', unit: 'KOM', quantity: 2 });
  });

  it('reads the JSON answer', () => {
    const json = JSON.stringify({
      isValid: true,
      invoiceRequest: {
        taxId: '104052135',
        businessName: 'NIS a.d. Novi Sad',
        locationName: 'BS Beograd 5',
        address: 'Bulevar 12',
        district: 'Vračar',
        transactionType: 0,
        payments: [{ amount: 8379.98, paymentType: 2 }],
      },
      invoiceResult: {
        sdcTime: '2026-10-25T12:03:11.93Z',
        invoiceNumber: 'AB12CD34-AB12CD34-5678',
        totalAmount: 8379.98,
      },
      journal: fuelJournal,
    });
    const r = parseReceipt(base, json);
    expect(r?.status).toBe('ok');
    expect(r?.shop).toBe('BS Beograd 5');
    expect(r?.total).toBeCloseTo(8379.98);
    // UTC from the tax office, shown in Belgrade time (CET/CEST).
    expect(r?.time).toBe('2026-10-25T13:03:11');
    expect(r?.payment).toBe('Card');
    expect(r?.items).toHaveLength(2);
  });

  it('fails a receipt the tax office does not know', () => {
    const r = parseReceipt(base, '{"isValid":false,"invoiceRequest":{}}');
    expect(r?.status).toBe('failed');
    expect(r?.error).toMatch(/doesn't know/);
  });

  it('makes a refund negative', () => {
    const r = parseJournal(base, fuelJournal.replace('ПРОМЕТ ПРОДАЈА', 'ПРОМЕТ РЕФУНДАЦИЈА'));
    expect(r.refund).toBe(true);
    expect(r.total).toBeCloseTo(-8379.98);
  });

  it('reads the HTML page', () => {
    const html = `<span id="shopFullNameLabel">MAXI &amp; CO</span><span id="tinLabel">100000001</span>
<span id="totalAmountLabel">1.234,50</span><span id="sdcDateTimeLabel">03.01.2026. 09:05:07</span>
<span id="invoiceNumberLabel">X-Y-1</span><pre style="x">ПИБ: 100000001
Укупан износ:  1.234,50</pre>`;
    const r = parseReceipt(base, html);
    expect(r?.company).toBe('MAXI & CO');
    expect(r?.total).toBeCloseTo(1234.5);
    expect(r?.time).toBe('2026-01-03T09:05:07');
    expect(r?.invoiceNumber).toBe('X-Y-1');
    expect(parseHtml(base, '<html>Not found</html>')).toBeNull();
    expect(parseReceipt(base, '<html>Not found</html>')).toBeNull();
  });

  it('turns Cyrillic into Latin', () => {
    expect(latin('ЉУБАВ Његош Ђурђевдан Џемпер')).toBe('LJUBAV Njegoš Đurđevdan Džemper');
    expect(latin('  ')).toBeNull();
    expect(latin('Љубљана')).toBe('Ljubljana');
  });

  it('knows who a receipt was issued to', () => {
    expect(companyTin('10:104052135')).toBe('104052135');
    expect(companyTin('12:104052135')).toBe('104052135');
    expect(companyTin('11:0101990710123')).toBeNull();
    expect(buyerTinIn('x\nИД купца: 10:104052135\ny')).toBe('104052135');
    const company = parseJournal(base, `ИД купца:  10:104052135\n${fuelJournal}`);
    expect(company.buyerTin).toBe('104052135');
  });

  it('keeps an owner chosen by hand when the receipt is read again', () => {
    const mine = { ...base, ownerManual: true, buyerTin: null };
    const r = parseJournal(mine, `ИД купца:  10:104052135\n${fuelJournal}`);
    expect(r.buyerTin).toBeNull();
    const other = { ...base, ownerManual: true, buyerTin: '100000001' };
    expect(parseJournal(other, fuelJournal).buyerTin).toBe('100000001');
  });
});
