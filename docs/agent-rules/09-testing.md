# 09 — Testing rules

**Scope:** All unit, component, and E2E tests in Hive (Jest 30 + jest-expo ~58, @testing-library/react-native v14, Maestro flows in `.maestro/`). Exemplars: [src/screens/home/index.test.tsx](../../src/screens/home/index.test.tsx) (data hooks mocked), [src/utils/home-groups.test.ts](../../src/utils/home-groups.test.ts) (pure logic), [src/screens/settings/index.test.tsx](../../src/screens/settings/index.test.tsx) (remote, fresh QueryClient, `@/lib/api` mocked).

## Non-negotiables

- [ ] NEVER edit, skip, or delete a test to make it pass — fix the code, or report the conflict (§1).
- [ ] `await render(...)` — RNTL v14 `render()` is **async**; so are `rerender`, `unmount`, `renderHook`, and every `userEvent` call.
- [ ] Mock only at the boundaries: SQLite-backed data hooks, `@/lib/api`, and missing native modules — never a renderable child or TanStack Query (§5).
- [ ] Fresh `QueryClient` per test with `{ retry: false, gcTime: Infinity }` whenever real query hooks run (§6).
- [ ] Wait for the **value**, not just the element (§3).
- [ ] Prefer `userEvent` over `fireEvent`; query role → text/label → testID.
- [ ] Fewer, longer tests: one test per user flow, not one per assertion.
- [ ] Every user-visible feature adds or updates a Maestro flow (§8).
- [ ] No `.only`/`.skip`/`xit`, every test asserts, snapshots ≤ 50 lines (lint: eslint-plugin-jest); interactive elements carry a `testID` (lint: `local/require-testid`).
- [ ] No `.skip`/`.only`, `eslint-disable`, `@ts-ignore`, or edits to `__snapshots__` / `.maestro/**/*.png` (hook: guard-edits); removing an `expect()` asks first (hook).
- [ ] `pnpm check` passes before a task is done (hook: Stop runs it; CI runs `pnpm test:coverage --ci`).

## 1. Test integrity — the anti-tampering contract

- A failing test is a signal, not an obstacle. NEVER edit, weaken, skip, or delete a test (or loosen its matcher, timeout, or mock) to turn it green. Fix the code under test.
- If the test and the spec genuinely disagree, stop and report the conflict to the user with both sides quoted — do not pick one silently.
- A new test is added only if it **fails before** the fix/feature and **passes after**. Check it actually fails first; a test that never failed proves nothing.
- Never test the mock you are changing: if a change touches a mock, the assertion must still exercise real code beyond it.
- Every bug fix adds a regression test meeting the rule above.
- Coverage is a ratchet, not a target (§10): never write tests just to touch lines, and never lower thresholds.

## 2. Jest + jest-expo configuration (facts, do not fight them)

- Config lives in `package.json` → `"jest"` (preset `jest-expo`, `setupFilesAfterEnv: ["./jest.setup.ts"]`, `.maestro/` ignored, CSS mapped to `__mocks__/style-mock.js`, coverage settings). Do not create a `jest.config.js`.
- Jest always runs in `Europe/Belgrade`: `globalSetup` ([jest.global-setup.js](../../jest.global-setup.js)) sets `TZ` before the workers start, so date tests cross real daylight saving changes on every machine and in CI. Never set `TZ` in `jest.setup.ts` or a test: tests see a copy of `process.env` that `Date` ignores.
- jest-expo ~58 requires Jest 30 — do not change either major.
- New dependency throws `SyntaxError: Unexpected token`? Extend `transformIgnorePatterns` (keep the `.pnpm` entry) — never mock the whole package to dodge the transform.
- Module mocks every test needs go in [jest.setup.ts](../../jest.setup.ts) (it already mocks `expo-updates`; it deliberately sets no `EXPO_PUBLIC_*` values, so tests run like an EAS Update bundle), not in individual test files.
- Repo-local ESLint rules have RuleTester specs in `eslint/rules/rules.test.js`, run by `pnpm test`.

## 3. RNTL v14 traps

- `render()` returns a Promise; a non-awaited render queries against nothing. Query via `screen`, not the destructured render result.
- Matchers (`toBeOnTheScreen`, `toHaveTextContent`, `toBeDisabled`, …) are built in. NEVER import `@testing-library/react-native/extend-expect` or `@testing-library/jest-native`.
- RNTL throws the production "text strings must be rendered within `<Text>`" error — fix the component, never suppress.
- `userEvent.setup()` then `await user.press(...)` / `await user.type(...)`. `type()` **appends**; `clear()` first to replace. Use `fireEvent` only for events userEvent lacks (e.g. `layout`).
- `findBy*` = `getBy*` + `waitFor` — never wrap `getBy*` in `waitFor` when a `findBy*` exists. `queryBy*` only to assert absence.
- **Wait for the value, not the element.** An element that renders immediately with a placeholder makes `findBy*` resolve too early. The Settings (formerly Home) test was flaky because `findByTestId('app-info-server')` resolved while the row still showed `checking…`; it now uses:

```tsx
await waitFor(() => expect(screen.getByTestId('app-info-server')).toHaveTextContent('ok'));
```

- One assertion per `waitFor`, no side effects inside it, never an empty `waitFor(() => {})` "flush", no manual `act()` around `render`/`userEvent`, no `setTimeout` sleeps. An "act" warning means you did not await the right thing — fix the wait, don't silence it.
- If `getByRole`/`getByLabelText` can't find an element a user clearly sees, the component's accessibility is broken: fix it — don't fall back to `testID` and don't add wrong roles to make the query pass.

## 4. What to test

- Behavior through the public surface: what renders, what happens on press/type, what is announced. Not state, hook internals, styles, render counts, or composite-element props.
- One flow per test: render once, assert loading, await loaded UI, interact, assert the outcome. Do not slice a flow into tests sharing state via `beforeAll`.
- Snapshots never stand alone; UI regression coverage belongs in Maestro.
- Pure logic (e.g. [format-date.ts](../../src/utils/format-date.ts), [home-groups.ts](../../src/utils/home-groups.ts), a module's `domain/`): table-style unit tests, no rendering, no mocks. Hooks: test through a component; `renderHook` only for logic-only hooks.
- Don't test third-party behavior, generated code, or trivial pass-through components.

## 5. Mocking rules

- **Database boundary = the data hooks.** expo-sqlite has no JS implementation in Jest, so screens over SQLite mock their hook module — `jest.mock('../../data/queries')` in a module screen, `jest.mock('@/hooks/use-home-layout')` and `jest.mock('@/hooks/use-app-usage')` in Home and the group folder — and set return values with `jest.mocked(useThing).mockReturnValue(...)` (copy the Home test or a generated module test). Keep business logic out of hooks (in `domain/` / `home-groups.ts`) so it is tested for real. Never mock `drizzle-orm` or `@/lib/db/client` from a screen test.
- **Network boundary:** `jest.mock('@/lib/api', ...)` ([src/lib/api.ts](../../src/lib/api.ts)) — copy the Settings test's factory (`...jest.requireActual('@/lib/api')`, `api: jest.fn()`); use `jest.mocked(api)` for typed access. Everything above that boundary runs real code.
- NEVER mock `fetch` per component, a child component you can render, or TanStack Query.
- Native modules: jest-expo mocks the Expo SDK; add minimal mocks only for what it misses (pattern: `expo-updates` in [jest.setup.ts](../../jest.setup.ts)) — only the fields the app reads.
- Suites sharing mocks call `jest.clearAllMocks()` in a local `beforeEach`; no call state leaks across tests.

## 6. TanStack Query in tests

- Fresh client per test — copy the `renderSettings` helper ([review-lessons L-002](review-lessons.md)):

```tsx
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
});
```

- `retry: false` — default retries make error-path tests hang past the Jest timeout. `gcTime: Infinity` — no GC timers left running at worker teardown.
- NEVER reuse the app client from [src/lib/query-client.ts](../../src/lib/query-client.ts) — cache bleeds between tests.
- Cover loading → success and loading → error via the mocked `api`, asserting rendered output, not cache internals.

## 7. File conventions

- Colocated: `foo.ts` + `foo.test.ts`; screens `<screen folder>/index.test.tsx` (`src/modules/<id>/screens/<name>/` or `src/screens/<name>/`). No `__tests__/`, no top-level `test/`, no `-test.tsx` suffix. Kebab-case names (lint: check-file).
- Test files pass `pnpm typecheck` with real types (no `any`: hook).
- `describe` named after the unit; test names state behavior ("renders the title and build info").

## 8. Maestro E2E

Conventions (flow layout, `appId`, `id:` selectors, `subflows/` + `runFlow`, no sleeps, tags + `config.yaml`, screenshot baselines) are in [.maestro/AGENTS.md](../../.maestro/AGENTS.md). Hive-specific additions:

- A user-visible feature (new screen, interaction, or navigation change) adds/updates a flow in the same PR; pure refactors don't. A module's flow (`.maestro/<id>.yaml`, generated by `pnpm new:module`) opens it from its tile on its Home group card (`id: 'home-open-<id>'`); in a group of more than four apps, an app outside the three most used opens from the folder (`home-group-<group>-more`, then `group-open-<id>`).
- `pnpm test:e2e` runs against a dev build **already installed** (`pnpm build:dev:ios` / `pnpm build:dev:android`, then install) — Maestro doesn't build. A failure without an installed build says nothing about the app.
- Slow transitions: `extendedWaitUntil` with `visible:`/`notVisible:` and a `timeout:` (ms), never a sleep.

## 9. Device verification (agent-device)

- For visual/behavioral confirmation on a simulator, use the global `agent-device`: open the app, read the accessibility snapshot, tap via testIDs, capture screenshots as PR evidence. It complements, never replaces, a Maestro flow.

## 10. Coverage

- Ratchet in `package.json` (`coverageThreshold.global`, over `src/**`), checked by `pnpm test:coverage` in CI. Thresholds only ever go up — raise them when coverage grows; never lower them (CODEOWNERS covers `package.json`).
- Priority: pure utils → hooks/data logic (success + error) → screens (loading/empty/error states) → Maestro (critical journeys).

## Common agent mistakes

1. "Fixing" a red test by changing the test, its mock, or its timeout instead of the code — or adding a test that never failed.
2. Forgetting `await` on `render()` / `rerender()` / `userEvent` calls — tests pass vacuously or flake.
3. `findBy*` on an element that renders with a placeholder, then asserting the value — wait for the value with `waitFor` (§3).
4. Shared `QueryClient`, or missing `retry: false` / `gcTime: Infinity` — cache bleed, hangs, teardown warnings.
5. Mocking a child component, TanStack Query or Drizzle instead of the data hooks / `@/lib/api`.
6. Importing `extend-expect` / `@testing-library/jest-native`.
7. `fireEvent.press` by default; `getByTestId` first where `getByRole`/`getByText` works (in unit tests — Maestro selects by `id:`).
8. Slicing one flow into many single-assertion tests wired through `beforeAll`.
9. Empty `waitFor`, manual `act()`, or sleeps to silence warnings.
10. Running `maestro test` without an installed dev build and concluding the app is broken.
