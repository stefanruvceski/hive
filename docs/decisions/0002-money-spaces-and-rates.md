# ADR 0002 — Money: owners (Private and businesses), per-entry rates, NBS rates

- **Date:** 2026-11-03
- **Status:** Accepted
- **Decided by:** the maintainer; details marked "agent" were decided while building and are listed in the PR

## Context

Money tracks income and spending for one person who also runs a business: salary arrives privately, revenue arrives on the firm, and some spending (fuel) belongs to the firm. Amounts are mostly RSD but can be EUR, USD and others. A later Wallet integration should split a scanned receipt into items.

## Decision

1. **One owner per entry: Private or one business.** A business has a name and a PIB (the Serbian tax number, checked with its check digit); there can be any number of them, and a PIB is added once (`useEnsureBusiness` finds or creates the business for a PIB, which is what a scanned receipt will call). The Money screens show a view: **All**, **Private** or one business, chosen with chips at the top (shown once a business exists). Categories come in two lists: Private, and one Business list shared by all businesses. Every entry, budget and recurring rule belongs to one owner. There are no accounts or wallets.
2. **Three kinds of entry:** expense, income and _payout_. A payout moves money from Business to Private. It is stored as two rows (one per space) sharing a `pair_id`, so each space's balance is right, and it is never counted as income, so money is not counted twice.
3. **Integer minor units.** Amounts are stored in para/cents. Each entry keeps its currency, the rate used (RSD per unit) and its RSD value, fixed at save time. Changing a rate later never moves old totals.
4. **Base currency RSD.** Totals, budgets and charts are in RSD.
5. **Entries may have line items** (name, amount, category). Their sum must equal the entry's amount; the entry then has no category of its own. Overview and budgets count spending per item category, sharing the RSD value by largest remainder. Receipt scanning is out of scope here and will fill these items later.
6. **Rates come from the NBS middle rate** (keyless, via `kurs.resenje.org`, as in hive-poc), fetched for the entry's day when a foreign currency is picked and kept in `money_rates` (`source = 'nbs'`) for offline use. The user can overwrite it on the entry; if the bank cannot be reached, the latest known rate is suggested or one is typed.
7. **Recurring rules** create entries when Money opens, up to today. The unique index `(recurring_id, date)` makes this idempotent. A foreign-currency rule waits until a rate is known instead of guessing.
8. **Charts use `react-native-svg`** (new native dependency ⇒ store release).

## Rates source

`kurs.resenje.org` republishes the official NBS list as JSON without a key, so nothing secret is in the app. It is a third-party mirror and the first source. Since 2026-11-04 (amended with [ADR 0004](0004-shared-businesses.md)'s review) a failure is no longer silent: `getNbsRate` says **why** (`network`, `status` with the HTTP code, `shape` for an answer that is not a list of rates, `unlisted` for a currency the list lacks) and the entry screen shows it ("Could not get the NBS rate: the rate service answered with an error (HTTP 503). Enter one.").

When the mirror fails (not for `unlisted`) and the day is today or later, the NBS's own middle-rate page (`www.nbs.rs/kursnaListaModul/srednjiKurs.faces`) is tried: its table row for the currency holds the parity and the middle rate (`parseNbsPage`). The page shows only the rates in force, so a past day has no fallback. That parser follows the page layout and could not be run against the live page when it was written; if the layout changes the user sees `shape` and types a rate. `domain/fx.ts` and `data/fx-client.ts` are the only places to change, and manual rates keep working.

## Consequences

- One new migration (`0014`), seven tables prefixed `money_`.
- Export is CSV with a byte-order mark, one row per entry or per item.
- Money has its own date/id helpers because modules never import each other.
