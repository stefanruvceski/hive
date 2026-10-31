# Review lessons — accepted PR findings (living ledger)

Accepted review findings from past PRs, kept so the same mistake is never made twice.

**For agents — when to use this file:**

- **Before implementing a ticket** (mandatory step in
  [ticket-workflow](../../.github/instructions/ticket-workflow.instructions.md)): read the
  entries for the domains you touch. Treat every active entry as a rule.
- **After a review finding is accepted** (fix applied or maintainer agrees): append an entry
  using the format below — but first check it isn't a duplicate and doesn't belong elsewhere.

**Lifecycle (keep this file small and sharp):**

1. New accepted finding → check for an existing entry; if one exists, bump its `Seen` count
   instead of duplicating.
2. A lesson seen 2+ times, or clearly generalizable → **promote it**, in this order of
   preference: a lint rule (`eslint.config.js` / `eslint/rules/` with a RuleTester spec), a test,
   a Claude Code hook (`.claude/hooks/`), a line in the nearest directory `AGENTS.md`, and only
   then a rulebook (01–14). Then delete the entry here and note the promotion in the PR.
3. A lesson invalidated by stack changes → delete it. Re-read this file at every Expo SDK upgrade.
4. One-off nits that eslint/prettier already catch do NOT get entries.

**Entry format:**

```
### L-<next-number> — <YYYY-MM-DD> — <PR #N or "pre-PR audit">
- Domain: <rulebook numbers, e.g. 07, 14>
- Mistake: <what the change did wrong, one or two lines>
- Instead: <the correct approach, with file/pattern reference>
- Seen: 1
```

---

## Active lessons

### L-001 — 2026-10-29 — pre-PR audit

- Domain: 08, 10
- Mistake: Adding an import chain that pulls `src/lib/env.ts` into the root layout
  (`_layout → query-client → api → env`) silently made EVERY bundle/export require
  `EXPO_PUBLIC_API_URL` — the CI web-export step broke because nobody checked what the new
  import transitively requires at module-eval time.
- Instead: Before importing anything into `_layout.tsx` (or any module it reaches), check for
  module-level side effects/env requirements. An env var never becomes mandatory (01 §5).
- Again in #18: a required `EXPO_PUBLIC_API_URL` crashed every EAS Update bundle on launch.
  Env part promoted: `env.ts` values are optional, CI exports without env, regression test
  `src/lib/env.test.ts` ([01 §5](01-architecture.md)). The import-time rule stays here.
- Seen: 2

### L-002 — 2026-10-29 — pre-PR audit

- Domain: 09
- Mistake: A test `QueryClient` created without `gcTime: Infinity` leaves GC timers running
  after the test, producing Jest worker-teardown warnings that look like test flakiness.
- Instead: Copy the `renderSettings` helper pattern from
  [src/screens/settings/index.test.tsx](../../src/screens/settings/index.test.tsx): fresh client per
  test with `{ retry: false, gcTime: Infinity }`.
- Seen: 1

### L-003 — 2026-10-30 — pre-PR audit

- Domain: 09
- Mistake: `expect(await screen.findByTestId('app-info-server')).toHaveTextContent('ok')` —
  `findBy*` resolves as soon as the element exists, which is while it still shows
  `checking…`, so the test passed or failed depending on machine load.
- Instead: when an element renders before its data, wait for the value:
  `await waitFor(() => expect(screen.getByTestId('…')).toHaveTextContent('ok'))` — see
  [src/screens/settings/index.test.tsx](../../src/screens/settings/index.test.tsx).
- Seen: 1
