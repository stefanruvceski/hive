# 14 — Errors, resilience & observability

**Scope:** Hive's decisions for everything that fails — render errors, query/mutation failures, network loss, broken OTA updates, server errors — and how failures are shown, logged, and (later) reported. Security and privacy of what you log: [13-security.md](13-security.md).

## Non-negotiables

- [ ] Every query-driven screen renders loading / error / empty / success with the standard components in `src/components/ui/` — never a blank screen or spinner-forever (§3).
- [ ] Every error state offers an action (retry wired to `refetch()` / boundary `retry`, or a link out).
- [ ] Error boundaries catch render errors only — event-handler and async failures are handled where they occur (mutation `isError`, try/catch) (§1).
- [ ] Global error side effects live ONLY in `QueryCache`/`MutationCache` in [src/lib/query-client.ts](../../src/lib/query-client.ts) — no per-hook copies (§2).
- [ ] No ad-hoc retry loops or timeout races — retry is the query client's job, timeout is `api.ts`'s (§2, §4).
- [ ] NEVER log tokens, credentials, bodies with user data, or PII (§6).
- [ ] API routes return `{ error: { code, message } }` with a correct status and never leak internals (§7).
- [ ] expo-updates recovery is a last resort, not a safety net (§5).
- [ ] NEVER call `ErrorUtils.setGlobalHandler` / hand-roll `window.onerror` (§9).
- [ ] Unhandled promises **(lint: `no-floating-promises`)**; `console.log` **(lint: `no-console`, `error`/`warn` allowed)**.

---

## 1. Error boundaries (Expo Router)

**In place:** [src/components/error-fallback.tsx](../../src/components/error-fallback.tsx) is the root `ErrorBoundary` and `unstable_settings.screenErrorBoundary` in [src/app/\_layout.tsx](../../src/app/_layout.tsx), so a crashing screen keeps the Stack header mounted and shows friendly copy + "Try again". Copy its shape for any new fallback.

- Precedence: `ErrorBoundary` exported from the screen → navigator prop `unstable_screenErrorBoundary` → `unstable_settings.screenErrorBoundary` (inherited by nested layouts; `null` stops inheriting). Add a route-level boundary only when that route needs different recovery UI — not by copy-paste.
- Fallback UI follows the design system (themed components, tokens, `testID`s, dark mode — [03](03-ui-design-system.md), [12](12-accessibility-platform.md)). Never show raw `error.message`.
- `+not-found.tsx` is not an error boundary ([02-navigation.md](02-navigation.md)); keep its link back to `/`.
- Boundaries do not see `onPress`/async failures. Server calls in handlers go through a mutation and render `mutation.isError`; other async work uses try/catch that updates UI state. A `void promise` is only acceptable when its failure is handled/logged in a `.catch`.

## 2. TanStack Query error strategy

**Canonical home for global error handling and retry config** (07 links here).

- **Inline states are the default** (`isPending` / `isError` + `refetch`, 07 §1). `throwOnError: true` / `useSuspenseQuery` only when a whole route is useless without the data **and** it has a boundary. Don't mix both styles in one screen.
- With suspense, a query that already has cached data renders stale data instead of throwing — don't fight it.
- A boundary over `throwOnError` queries must reset via `useQueryErrorResetBoundary` / `QueryErrorResetBoundary`; Expo Router's `retry` alone re-renders but leaves the query errored.
- **Global handlers:** `QueryCache`/`MutationCache` `onError` call `logError` in [query-client.ts](../../src/lib/query-client.ts). Add cross-cutting side effects (toasts, reporting) there. Per-mutation `onError` is fine for **local** concerns (optimistic rollback, field errors — 07 §2). `useQuery` has no `onError` in v5.
- **Retry policy** (in `query-client.ts`): queries retry up to 2× with the library's default exponential backoff via `shouldRetryQuery`: network errors, 5xx, 408 and 429 retry; every other `ApiError` 4xx fails fast (unit-tested in `query-client.test.ts`). Keep the default `retryDelay`. Override per query in its `queryOptions`, never by editing global defaults for one screen.
- `retry: false` per query where a fast failure beats waiting (e.g. an existence check driving navigation).
- Mutations do not retry — keep it that way unless provably idempotent. NEVER give a non-idempotent POST `retry > 0`.

## 3. User-facing error UX

- Use [`LoadingState` / `ErrorState` / `EmptyState`](../../src/components/ui/) (`{loading,error,empty}-state.tsx`). `ErrorState` maps `ApiError` status to friendly copy (401/403 → sign in, 404 → not found, else generic) — extend that mapping there, never show raw server messages at call sites.
- 401/403 lead to the sign-in flow once auth exists; 404 offers a way back.
- If cached data exists, keep showing it when a background refetch fails — don't replace it with an error screen.
- Offline: under the default `networkMode: 'online'`, queries pause (`isPaused`) rather than error; surface `isPaused` where it matters (07 §9). Never zero out `gcTime`.
- Retry calls `refetch()` / boundary `retry` — never a reload hack or navigate-away as the only fix.
- States carry stable kebab-case `testID`s and are asserted in tests/Maestro ([09](09-testing.md)); see `error-state.test.tsx`.

## 4. Network resilience

- `api<T>()` applies a default 15 s `AbortSignal.timeout` unless the caller passes a `signal` ([src/lib/api.ts](../../src/lib/api.ts)). Don't add timeouts elsewhere.
- Forward TanStack's `signal` (`({ signal }) => api<T>(path, { signal })`) for slow/expensive queries so unmounts cancel. Note: a passed `signal` replaces the default timeout (`init?.signal ?? AbortSignal.timeout(...)`).
- Don't change `networkMode` per query to "fix" offline. Real offline support (NetInfo `onlineManager`, persisted cache) is additive and proposed first (07 §9).
- NEVER `catch { return [] }` in a `queryFn` — it turns an outage into silently wrong data.

## 5. expo-updates safety (OTA error recovery)

Documented behavior, subject to change — don't design around it:

- Catches fatal JS errors only within **~10 s of first render**, release builds only.
- Error **before** the first view renders, on the update's first launch → update marked failed, app tries to fetch a fix, else **rolls back** to the last good update (ultimately embedded).
- Error **after** content has appeared (now or on any earlier launch of that update) → no rollback; checks for a new update for ~5 s, then crashes. **Fix-forward only.**

Consequences for Hive:

- No non-backwards-compatible mutation of persisted state (AsyncStorage/SQLite/files) without a migration — it makes rollback unsafe.
- Keep the default early update check; NEVER set check-on-launch to `NEVER` (it disables the recovery download).
- Broken update shipped: fix forward ASAP; `republish` an older update only after confirming rollback is state-safe ([10-ci-release.md](10-ci-release.md)).
- Don't weaken the `fingerprint` runtime policy — it's what prevents JS calling missing native code.

## 6. Logging discipline & crash reporting

- **Log:** error name/message, `ApiError.status`, query key or route — structured, greppable, lowercase source prefix. Follow `logError` in `query-client.ts`.
- **NEVER log:** tokens, SecureStore contents, bodies with user data, emails/PII, env values — in `console.*`, `+api.ts` server logs, or any future SDK ([13 §12](13-security.md)).
- `console.error`/`warn` raise LogBox in dev — genuine defects only (a 404 for a deleted item is not one).
- Production `console.*` goes nowhere useful. No silent `catch {}`: at minimum a contextual log, normally UI state.
- **When monitoring is added (Sentry)** — not now, a maintainer decision proposed in a PR:
  - `@sentry/react-native` via `npx @sentry/wizard@latest -i reactNative` (config plugin + Metro config) ⇒ native change ⇒ **store release** ([10](10-ci-release.md)).
  - Source maps upload automatically on EAS Build; every `eas update` also needs `npx sentry-expo-upload-sourcemaps dist`.
  - Tag events with `Updates.updateId` / `Updates.isEmbeddedLaunch` (see [src/lib/app-info.ts](../../src/lib/app-info.ts)) so crashes map to OTA updates.
  - Configure PII scrubbing before the first event ([13 §12](13-security.md)).
  - Lighter alternatives: `expo-insights` / EAS Observe.

## 7. API route error contracts (`src/app/api/*+api.ts`)

Mechanics: [07 §10](07-data-state.md). Authn/authz: [13 §8](13-security.md).

- ONE error shape everywhere: `{ error: { code: string; message: string } }`.
- Status codes: 400 invalid input, 401 unauthenticated, 403 unauthorized, 404 missing, 409 conflict, 500 unexpected. NEVER 200-with-error-body.
- NEVER return stack traces, raw exception messages, upstream errors, or env values. Log server-side; return a generic `message`.

```ts
if (!thing) {
  return Response.json(
    { error: { code: 'not_found', message: 'Thing not found' } },
    { status: 404 },
  );
}
```

- An unexpected throw (→ automatic 500) is acceptable; catching it to return the standard shape + a server-side log is better. Bad input → 400 with an actionable `message`.

## 8. Graceful degradation: web vs native

- Web differences: not applicable — Hive ships no web UI ([ADR 0001](../decisions/0001-modules-sqlite-native-only.md)).
- iOS/Android-only APIs (`GlassView`, some `@expo/ui`) degrade explicitly via `Platform.select` or sibling platform files — never crash or silently no-op ([01 §7](01-architecture.md)).
- A failed database migration at startup throws to the root `ErrorBoundary` (`src/app/_layout.tsx`); never swallow it and render screens over a half-migrated database ([07 §8](07-data-state.md)).
- Feature-detect rather than platform-sniff when an API may be missing, and keep the fallback useful.

## 9. ErrorUtils & global handlers — reality check

- `ErrorUtils.setGlobalHandler` is internal API. expo-updates recovery and future crash SDKs chain their own handlers; overwriting them breaks rollback and reporting.
- Unhandled rejections in RN don't crash and vanish in release. The fix is no unawaited promises (lint catches most), not a global hook.
- Dev ≠ prod: caught boundary errors still hit LogBox in dev. Verify error flows in release-mode builds/E2E ([09](09-testing.md)).
- Layers: query/mutation state → route/screen boundary → root boundary → expo-updates recovery → crash reporter (when added). A PR only needs the first two right.

---

## Common agent mistakes

1. `data!` or `null` on `isError` instead of `ErrorState` with retry.
2. Expecting a boundary to catch an `onPress`/async failure.
3. Per-hook toast/log logic instead of `QueryCache`/`MutationCache`, or editing global defaults for one screen.
4. Retries on a non-idempotent mutation, or a custom retry loop / timeout race at a call site.
5. `catch { return [] }` in a `queryFn`.
6. Raw `error.message` or doc-sample styling in error UI instead of `ErrorState`/`ErrorFallback`.
7. Treating expo-updates recovery as license to skip testing an update.
8. 200 with an error body, leaking `error.stack`, or a new error shape per route.
9. Logging tokens, bodies, or PII "for debugging"; installing Sentry ad hoc.
10. A boundary over `throwOnError` queries without `useQueryErrorResetBoundary`.
