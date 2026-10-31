# 11 — TypeScript & Code Style

**Scope:** All TypeScript/TSX authored in this repo (`src/**`, config files, tests). Canonical home of the React Compiler rules (no manual memo, no `setState` in effects) — other files link to §11. Mandatory for humans and agents.

## Non-negotiables

- [ ] `pnpm check` (typecheck + lint + test) passes before a task is declared done. (hook: the Stop hook runs it)
- [ ] No `any`, no `@ts-ignore`/`@ts-nocheck`, no inline `eslint-disable`. (lint + hook)
- [ ] Data from outside the app is `unknown` until narrowed; `as` never silences the checker.
- [ ] Named exports only — **except** Expo Router route files in `src/app/`, which REQUIRE a default export. (lint)
- [ ] No `React.FC`, no `forwardRef`, no manual `useMemo`/`useCallback`/`memo`. (lint)
- [ ] No synchronous `setState` in `useEffect`; never mutate props, state, or hook return values. (lint)
- [ ] Prettier/ESLint output is final; lint runs with `--max-warnings 0`. (lint)

---

## 1. Strict mode discipline

Enforced by TS (`strict` + `noUncheckedIndexedAccess` in [tsconfig.json](../../tsconfig.json)) and lint (`no-explicit-any`, `ban-ts-comment`: `@ts-expect-error` only with a description); the edit hook blocks adding `any`/`@ts-ignore`. What tooling can't catch:

- **MUST type external boundaries as `unknown` and narrow** — network responses, `JSON.parse`, route params beyond typed routes, storage reads, event payloads, `catch` variables.

```ts
// ✅ unknown at the boundary, narrowed before use
const raw: unknown = JSON.parse(payload);
if (!isHiveMessage(raw)) throw new Error('Malformed message');
handle(raw); // raw: HiveMessage

// ❌ trust-me casting
const msg = JSON.parse(payload) as HiveMessage;
```

- **PREFER type guards** (`function isX(v: unknown): v is X`) over `as`. `as` is allowed only when widening-safe (`as const`) — never to silence the checker.
- **NEVER use `!`** unless the invariant is provable and locally obvious; add a one-line justification. With `noUncheckedIndexedAccess`, `arr[i]`/`record[key]` is `T | undefined` — narrow or use `??`, don't `!` it away.

## 2. Typing React components

Enforced by lint: `React.FC`/`FunctionComponent` are banned — type the props parameter directly.

- **MUST define a props type per component**, named `<Component>Props`, exported only if consumers need it. Use `type`, not `interface` (unless declaration merging is required).
- Type `children` as `ReactNode`; derive third-party props with `ComponentProps<typeof X>`; wrap RN components by extending their props (`TextProps & { … }`, see [themed-text.tsx](../../src/components/themed-text.tsx)).
- Functional components only — the React Compiler does not optimize classes.

## 3. Typing hooks

- **MUST annotate the return type of every exported custom hook.** Inference is fine for locals.
- Multi-value hooks return an object (`{ data, status, retry }`); tuples only for `useState`-like pairs, `as const`.
- Data hooks type responses via the `api<T>()` generic from [src/lib/api.ts](../../src/lib/api.ts) — never untyped query data.
- **NEVER cast a ref's `.current`** — type the ref: `useRef<View>(null)`.

## 4. Discriminated unions for state

- **MUST model multi-phase state as a discriminated union** with a literal discriminant (`status`/`kind`), not parallel booleans/optionals that permit impossible states.

```ts
// ✅ impossible states are unrepresentable
type SyncState =
  | { status: 'idle' }
  | { status: 'syncing'; progress: number }
  | { status: 'error'; error: Error }
  | { status: 'done'; syncedAt: Date };

// ❌ allows isLoading && error && data simultaneously
type SyncState = { isLoading: boolean; error?: Error; data?: Date };
```

## 5. Exhaustive switches

Enforced by lint (`@typescript-eslint/switch-exhaustiveness-check`, `allowDefaultCaseForExhaustiveSwitch: false`): list every case of a union and **don't add a `default`** — lint rejects one on an already-exhaustive switch, and a missing case fails lint.

- **PREFER `satisfies` for lookup tables** — checks completeness without widening:

```ts
const statusLabel = {
  idle: 'Idle',
  syncing: 'Syncing…',
  error: 'Failed',
  done: 'Done',
} satisfies Record<SyncState['status'], string>;
```

## 6. Imports: order and aliases

Enforced by lint: `import/order`, `import/no-cycle`, and layering via `import/no-restricted-paths` (see [01](01-architecture.md)).

- **MUST use the `@/` alias** for anything outside the current folder tree (`@/*` → `src/*`, `@/assets/*` → `assets/*`); relative imports only for same-folder/child files. Never `../../`.
- **PREFER `import { type X }`** for type-only imports.

## 7. Naming conventions

File and folder kebab-case in `src/` (except `src/app/`) is enforced by lint (`check-file`).

| Thing       | Convention                                                         | Example                        |
| ----------- | ------------------------------------------------------------------ | ------------------------------ |
| Components  | PascalCase                                                         | `AppInfoCard`                  |
| Values, fns | camelCase                                                          | `formatDate`, `syncedAt`       |
| Hooks       | `useX`, file `use-x.ts`                                            | `useTheme` in `use-theme.ts`   |
| Types       | PascalCase, no `I`/`T` prefixes                                    | `SyncState`, `ThemedTextProps` |
| Constants   | PascalCase for theme tokens; `SCREAMING_SNAKE` for env-like values | `Spacing`, `MaxContentWidth`   |
| Tests       | colocated `*.test.ts(x)`                                           | `format-date.test.ts`          |
| testIDs     | kebab-case strings                                                 | `testID="home-title"`          |

- One named component export per component file; a screen's private sub-components live in its `./components/`.

## 8. Exports: named only — with the Expo Router exception

Enforced by lint (`import/no-default-export`; `src/app/**` and config files exempt). See also [src/app/AGENTS.md](../../src/app/AGENTS.md).

- Every route file in `src/app/` (screens, `_layout.tsx`, `+not-found.tsx`) **MUST** `export default` its component — Expo Router resolves routes by it. API routes (`src/app/api/*+api.ts`) use named HTTP-method exports (`export function GET(…)`).

```tsx
// ✅ src/app/index.tsx — route file: thin + default export (required by Expo Router)
import { Home } from '@/screens/home';
export default function HomeRoute() {
  return <Home />;
}

// ✅ src/screens/home/index.tsx — everything else: named export
export function Home() { … }

// ❌ default export anywhere outside src/app/
export default function Home() { … }
```

## 9. Error handling (TypeScript side)

Floating promises are a lint error (`no-floating-promises`): `await`, return, or `void` with a reason. User-facing error UX, TanStack Query error strategy and logging live in [14](14-errors-resilience.md).

- **MUST narrow caught values** (`error instanceof Error` / `instanceof ApiError`) before reading properties.
- **PREFER dedicated error classes** for domain failures so callers can narrow — follow `ApiError` in [src/lib/api.ts](../../src/lib/api.ts).
- **MUST NOT throw non-`Error` values** (strings, objects).
- **NEVER swallow errors:** no empty `catch {}`, no log-only catch. Re-throw, convert to typed state, or surface it.

## 10. React 19 specifics

Enforced by lint: `forwardRef` is banned — `ref` is a regular prop (`type FieldProps = { ref?: Ref<TextInput> }`). Never use `propTypes`, `defaultProps` on functions (use default parameters), string refs, or legacy Context. Server state still belongs to TanStack Query, not `use(promise)`.

## 11. React Compiler compliance (Rules of React)

The React Compiler is on. Enforced by lint (`react-hooks` v7: `rules-of-hooks`, `set-state-in-effect`, `set-state-in-render`, `purity`, `refs`, `immutability`, `globals`, `static-components`, `use-memo`, `preserve-manual-memoization`, plus the `useMemo`/`useCallback`/`memo` import bans). A compiler lint error means the code breaks a Rule of React — fix the code, never suppress it. What the linter can't judge:

- **NEVER add manual memoization** — the compiler does it. Remove it when touching code that has it.
- **Derive, don't sync:** compute values during render instead of mirroring props into state from an effect.
- **Effects only synchronize with external systems** (subscriptions, native modules, analytics) — not for data transformation, reacting to prop changes, or user-event logic (do that in the handler).
- **Update immutably:** `setItems((prev) => [...prev, next])`, never `items.push(next)`.
- **The only opt-out is `'use no memo'`** at the top of a component/file, with a comment explaining why; treat it as tech debt.

## 12. Comments policy

- Comment **only what the code cannot say**: invariants, why a workaround exists (with link/ticket), a justified `!` or `@ts-expect-error`, non-obvious platform behavior.
- **NEVER** narrate the next line, leave commented-out code, or add JSDoc boilerplate to self-explanatory functions. No TODO without an owner/issue.

## 13. Prettier & ESLint are the source of truth

Enforced by lint (Prettier via `eslint-plugin-prettier`, `--max-warnings 0`, unused disable directives are errors) and the edit hook (blocks adding `eslint-disable`).

- Fix the code, never the rule. Repo-wide rule changes go through [eslint.config.js](../../eslint.config.js) in a dedicated PR. No `// prettier-ignore` without a commented reason.
- `eslint` stays pinned to 9.x (`eslint-config-expo` targets it). **NEVER bump to 10.**
- Never bypass the pre-commit hook (`--no-verify` is forbidden).

## Common agent mistakes

1. **Removing** the default export from an `src/app/` route file, or adding one elsewhere.
2. Casting API/JSON data with `as` instead of narrowing `unknown` — hides contract drift.
3. `!` on indexed access to dodge `noUncheckedIndexedAccess` instead of narrowing.
4. Parallel `isLoading`/`error`/`data` fields instead of a discriminated union.
5. Adding a `default:` to an exhaustive union switch "for safety" — lint rejects it; list the cases.
6. Empty or log-only `catch` blocks; throwing strings.
7. Mirroring props into state via an effect instead of deriving in render.
8. Reaching for `'use no memo'` or a rule change instead of fixing a Rules-of-React violation.
