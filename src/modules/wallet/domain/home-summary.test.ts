import { walletHomeSummary } from './home-summary';

type Entry = Parameters<typeof walletHomeSummary>[0][number];

const receipt = (_id: string, over: Partial<Entry> = {}): Entry => ({
  status: 'ok',
  total: 100000,
  time: '2026-11-03T10:00:00',
  addedAt: 1,
  ...over,
});

describe('walletHomeSummary', () => {
  it('asks for a first card or receipt when there is neither', () => {
    expect(walletHomeSummary([], 0, '2026-11-04')).toEqual({
      kind: 'message',
      caption: 'This month',
      headline: 'Nothing yet',
      body: 'Tap to add a card or scan a receipt',
      label: 'no cards or receipts yet',
    });
  });

  it('counts cards when there are no receipts this month', () => {
    expect(
      walletHomeSummary([receipt('old', { time: '2026-10-30T10:00:00' })], 2, '2026-11-04'),
    ).toMatchObject({
      headline: 'No receipts',
      body: '2 cards · tap to scan a receipt',
    });
    expect(walletHomeSummary([], 1, '2026-11-04')).toMatchObject({
      body: '1 card · tap to scan a receipt',
    });
  });

  it("shows the month's spending and the number of receipts", () => {
    const summary = walletHomeSummary(
      [receipt('a', { total: 837998 }), receipt('b', { total: 12002 })],
      3,
      '2026-11-04',
    );
    expect(summary).toEqual({
      kind: 'message',
      caption: 'This month',
      headline: '8.500,00',
      body: '2 receipts',
      footnote: 'RSD',
      label: 'Receipts this month: 8.500,00 RSD, 2 receipts',
    });
  });

  it('subtracts refunds and ignores receipts that could not be read', () => {
    const summary = walletHomeSummary(
      [
        receipt('a', { total: 100000 }),
        receipt('refund', { total: -30000 }),
        receipt('failed', { status: 'failed', total: null }),
      ],
      0,
      '2026-11-04',
    );
    expect(summary).toMatchObject({ headline: '700,00', body: '2 receipts' });
  });

  it('mentions receipts still waiting for their details', () => {
    const summary = walletHomeSummary(
      [
        receipt('a'),
        receipt('pending', {
          status: 'pending',
          total: null,
          time: null,
          addedAt: Date.UTC(2026, 10, 2),
        }),
      ],
      0,
      '2026-11-04',
    );
    expect(summary).toMatchObject({ body: '1 receipt · 1 waiting' });
  });
});
