// Pure Money logic: line items of an entry (a receipt split). Tested in items.test.ts.

export type ItemDraft = { name: string; amountMinor: number; categoryId: string };

export type ItemsCheck =
  { ok: true } | { ok: false; reason: 'empty-name' | 'bad-amount' | 'mismatch'; diff: number };

/**
 * Items are optional; when there are some, each needs a name and a positive amount, and together
 * they must equal the entry's amount. `diff` is total minus the items' sum (positive = missing).
 */
export function checkItems(totalMinor: number, items: readonly ItemDraft[]): ItemsCheck {
  const sum = items.reduce((acc, item) => acc + item.amountMinor, 0);
  const diff = totalMinor - sum;
  if (items.some((item) => item.name.trim() === ''))
    return { ok: false, reason: 'empty-name', diff };
  if (items.some((item) => !Number.isInteger(item.amountMinor) || item.amountMinor <= 0)) {
    return { ok: false, reason: 'bad-amount', diff };
  }
  return diff === 0 ? { ok: true } : { ok: false, reason: 'mismatch', diff };
}
