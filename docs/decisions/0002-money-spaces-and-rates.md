# ADR 0002 — Money: two spaces, per-entry rates, manual rates first

- **Date:** 2026-11-03
- **Status:** Accepted (rates source open — see below)
- **Decided by:** the maintainer; details marked "agent" were decided while building and are listed in the PR

## Context

Money tracks income and spending for one person who also runs a business: salary arrives privately, revenue arrives on the firm, and some spending (fuel) belongs to the firm. Amounts are mostly RSD but can be EUR, USD and others. A later Wallet integration should split a scanned receipt into items.

## Decision

1. **Two spaces, Private and Firma**, with a switch on the Money home. Every entry, category, budget and recurring rule lives in one space. There are no accounts or wallets.
2. **Three kinds of entry:** expense, income and _payout_. A payout moves money from Firma to Private. It is stored as two rows (one per space) sharing a `pair_id`, so each space's balance is right, and it is never counted as income, so money is not counted twice.
3. **Integer minor units.** Amounts are stored in para/cents. Each entry keeps its currency, the rate used (RSD per unit) and its RSD value, fixed at save time. Changing a rate later never moves old totals.
4. **Base currency RSD.** Totals, budgets and charts are in RSD.
5. **Entries may have line items** (name, amount, category). Their sum must equal the entry's amount; the entry then has no category of its own. Overview and budgets count spending per item category, sharing the RSD value by largest remainder. Receipt scanning is out of scope here and will fill these items later.
6. **Rates are typed by hand for now** (`money_rates`: currency, date, rate, source). The latest rate on or before the entry's date is suggested; using a foreign rate remembers it as that day's rate. `domain/rates.ts` is the seam for an automatic provider.
7. **Recurring rules** create entries when Money opens, up to today. The unique index `(recurring_id, date)` makes this idempotent. A foreign-currency rule waits until a rate is known instead of guessing.
8. **Charts use `react-native-svg`** (new native dependency ⇒ store release).

## Open: automatic NBS rates

The National Bank of Serbia publishes the official middle rate, but no keyless, documented JSON API was found that is safe to call from the client. The decision is deferred; the options are a small proxy that reads the NBS list (no secret in the app), or a free third-party rates API. Either would only add `source = 'nbs'` rows to `money_rates`. A rate API key must never ship in an `EXPO_PUBLIC_*` variable.

## Consequences

- One new migration (`0014`), seven tables prefixed `money_`.
- Export is CSV with a byte-order mark, one row per entry or per item.
- Money has its own date/id helpers because modules never import each other.
