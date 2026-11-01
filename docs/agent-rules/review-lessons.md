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

### L-004 — 2026-11-01 — review of #37

- Domain: 04
- Mistake: Settings wrapped its `ScrollView` in a `SafeAreaView` with the `bottom` edge, so the
  scroll area ended above the home indicator and the last card was cut off with a hard edge.
- Instead: leave `bottom` out of the `SafeAreaView` edges and add `useSafeAreaInsets().bottom` to
  the scroll content's `paddingBottom` — content scrolls to the screen edge and still clears the
  indicator ([src/screens/settings/index.tsx](../../src/screens/settings/index.tsx)).
- Seen: 1

### L-005 — 2026-11-01 — review of #42

- Domain: 02
- Mistake: Habits' Back and the form's after-save used `router.back()`. After a deep link (or a
  cold start) there was no screen below, so Back did nothing and the form stayed open after
  saving; the user saved again and got a duplicate. A first fix swapped the buttons to
  `router.dismissTo()`, which still left Android's back button and iOS swipe-back broken.
- Instead: the root layout anchors Home under every deep link with `unstable_settings.anchor`
  (SDK 58 name; `initialRouteName` is deprecated) in `src/app/_layout.tsx`; a nested
  `<id>/_layout.tsx` sets its own. Screens use `router.back()`. A form whose Back and Save must
  reach the same screen (Habits' list) uses `router.dismissTo(href)` for both, since under a deep
  link the screen below it is Home.
- Seen: 1

### L-006 — 2026-11-01 — review of #42

- Domain: 07
- Mistake: Save was guarded only by `disabled={mutation.isPending}`, which takes effect after a
  re-render, so two quick taps saved two habits. The first fix released its guard in `onSettled`,
  which runs right after a synchronous SQLite write while the form is still animating out, so a
  second tap could still save; its test missed this because the `mutate` mock never settled.
- Instead: guard a submit with a `useRef` flag set on press and released only in `onError`
  (`src/modules/habits/screens/new/index.tsx`). Mutation mocks call `onSuccess`/`onError` and
  `onSettled` like the real hook. When a second form needs the guard, move it into a shared hook.
- Seen: 1

### L-007 — 2026-11-01 — review of #42

- Domain: 12
- Mistake: `SegmentedControl` kept its vertical `hitSlop` when the segments stacked at large text
  sizes, so neighbours' slops overlapped and a tap near the line could pick the wrong option. The
  first fix dropped the slop but made each segment 44 high, under Android's 48 dp minimum.
- Instead: when touch targets sit edge to edge, drop the slop and size each target to at least
  48 (iOS 44 pt / Android 48 dp; design against 48), derived from tokens:
  `Layout.segmented.height + hitSlop.top + hitSlop.bottom` (`src/components/ui/segmented-control.tsx`).
- Seen: 1

### L-008 — 2026-11-01 — review of #42

- Domain: 07
- Mistake: The PR carried the scaffold's sample-table migration (`habits_items`) plus a second one
  that dropped it. A review fix then replaced both with one new migration after the branch had
  been pushed; caught before commit, but any dev build or PR preview that had run the old pair
  would have re-created `habits_habits` and failed to start until its data was wiped.
- Instead: a migration that has left your machine (pushed, in a preview, on a phone) is never
  dropped or rewritten; add a new one. Merge unshipped migrations only before the first push:
  remove the scaffold's sample migration with `npx drizzle-kit drop` (never by hand), then run
  `pnpm db:generate` once.
- Seen: 1

### L-009 — 2026-11-01 — review of #42

- Domain: 11
- Mistake: Logic written twice: a module re-implemented `YYYY-MM-DD` formatting that Settings'
  display helper already had, and the form trimmed the name that the mutation trims and validates
  again. The first fix reused the display helper for the stored date, tying saved data to a
  display preference.
- Instead: search `src/utils/` before writing a helper, but keep storage and display formats
  apart: stored dates use `toIsoDate` (`src/utils/format-date.ts`); `formatDateExample` stays a
  display helper. Validate input in one place: the mutation or `domain/` (07 §7).
- Seen: 1

### L-010 — 2026-11-01 — review of #42

- Domain: 09
- Mistake: The Habits Maestro flow opened the module by deep link, a decision taken at a
  checkpoint, but `src/modules/AGENTS.md` and `.maestro/AGENTS.md` still required
  `home-open-<id>`. A cold-start step added afterwards (`stopApp` then `openLink`) could not pass:
  a dev build shows its launcher on a cold start.
- Instead: when an agreed decision departs from a rule file, update that file in the same PR.
  In Maestro, open links only after `launchApp`; cover cold-start behaviour with unit tests.
- Seen: 1
