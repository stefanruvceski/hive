# 01 — Architecture & Project Structure (MANDATORY)

**Scope:** Where files live, how layers and modules depend on each other, naming, CNG, env handling, and platform-specific files in Hive. Hive is a home for mini-apps ("modules": Health, Habits, Money…); the decision record is [ADR 0001](../decisions/0001-modules-sqlite-native-only.md). The folder tree itself is in [AGENTS.md](../../AGENTS.md#project-structure-do-not-reorganize).

## Non-negotiables

- [ ] NEVER create or edit anything in `ios/` or `android/` — generated (CNG) and git-ignored.
- [ ] NEVER reorganize `src/` or add top-level `src/` folders; add files into the existing structure (§2).
- [ ] Route files in `src/app/` stay thin; screen UI lives in `src/modules/<id>/screens/` (module screens) or `src/screens/` (shell screens: Home, Settings) ([02 §1](02-navigation.md#1-file-based-routing-conventions-srcapp)).
- [ ] Imports flow one way: `app → modules / screens → components → hooks → lib → utils`. (lint) A layering error means fix the design, not the rule.
- [ ] Modules never import each other (lint: `local/no-cross-module-imports`); a screen never imports another screen's folder — promote shared pieces to `src/components/`, `src/lib/` or `src/utils/`.
- [ ] kebab-case files/folders (lint); named exports only, default exports only in `src/app/` (lint).
- [ ] pnpm only. `npx expo install` for every `expo-*` / `react-native-*` package; `pnpm add` only for pure-JS packages.
- [ ] Client config only via `env` from `src/lib/env.ts` (lint); only `EXPO_PUBLIC_*` reach the client, and they are never secrets.
- [ ] No "eject", no "managed vs bare" — use `app.config.ts` + config plugins.
- [ ] `pnpm check` passes before stopping (hook, CI); `pnpm doctor:expo` + `pnpm deps:check` after dependency changes (CI runs `doctor:expo`).

---

## 1. Layering and dependency direction

Enforced by `import/no-restricted-paths` and `import/no-cycle` in [eslint.config.js](../../eslint.config.js): `app → modules / screens → components → hooks → lib → utils`, never upward, never circular. Modules and shell screens must not import `src/app`; components, hooks, lib and utils must not import `src/modules`. `src/constants` and `src/types` are leaves anyone may import.

- **Modules are isolated (lint).** `src/modules/<id>/` never imports another module (`local/no-cross-module-imports`, [eslint/rules/no-cross-module-imports.js](../../eslint/rules/no-cross-module-imports.js)). `src/modules/registry.ts` is the shell's module list, not a module: it is exempt, and shell screens (Home) import `@/modules/registry`. Module anatomy: [src/modules/AGENTS.md](../../src/modules/AGENTS.md).

Not machine-enforced — still binding:

- No imports between screen folders (`src/screens/a` → `src/screens/b`). Promote the shared piece to `src/components/` when the second consumer appears.
- `src/utils/**` is pure: no React, no React Native, no I/O. Needs a hook → `src/hooks/`. Needs fetch/env/query client → `src/lib/`.
- `src/lib/**` is infrastructure only (database, api client, env, query client, app-info) — see [src/lib/AGENTS.md](../../src/lib/AGENTS.md).
- Use the `@/` alias across folders; relative imports only within the same folder tree ([11 §6](11-typescript-style.md)).

## 2. Where every kind of file goes

| What you are adding                       | Where it goes                                          | Notes                                                                                            |
| ----------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| A new mini-app (module)                   | `src/modules/<id>/` + `src/app/<id>/index.tsx`         | `pnpm new:module <id>` — never by hand; see [src/modules/AGENTS.md](../../src/modules/AGENTS.md) |
| Module screen                             | `src/modules/<id>/screens/<name>/index.tsx`            | `pnpm new:screen <id>/<name>`; route `src/app/<id>/<name>.tsx`                                   |
| Module tables / queries                   | `src/modules/<id>/data/{schema,queries}.ts`            | Tables prefixed `<id_snake>_`; see [07 §8](07-data-state.md)                                     |
| Module domain logic (pure)                | `src/modules/<id>/domain/<name>.ts` + `.test.ts`       | No React, no database                                                                            |
| Shell screen (Home, Settings…)            | `src/app/<route>.tsx` + `src/screens/<name>/index.tsx` | `pnpm new:screen <name>`; route is thin, see [02](02-navigation.md)                              |
| Server endpoint                           | `src/app/api/<name>+api.ts`                            | Server-only; see §6                                                                              |
| Component used by exactly one screen      | `<screen folder>/components/<comp>.tsx`                | Private to the screen                                                                            |
| Component used by ≥2 screens              | `src/components/<comp>.tsx`                            | Promote when the second consumer appears, not before                                             |
| Low-level primitive (no business meaning) | `src/components/ui/<comp>.tsx`                         | e.g. collapsible, loading/error/empty states                                                     |
| Reusable hook                             | `src/hooks/use-<name>.ts`                              | Query hooks for one screen live in that screen's folder; shared ones `src/lib/`                  |
| App infrastructure                        | `src/lib/<name>.ts`                                    | db client/core schema (`db/`), api client, env, query-client, app-info                           |
| Pure helper                               | `src/utils/<name>.ts` + `src/utils/<name>.test.ts`     | Tests always colocated                                                                           |
| Theme token (color, spacing, font)        | `src/constants/theme.ts`                               | See [03 §1](03-ui-design-system.md#1-theme-tokens--the-only-source-of-color-and-spacing)         |
| Ambient type declarations                 | `src/types/*.d.ts`                                     | Declarations only, no runtime code                                                               |
| Images, fonts                             | `assets/`                                              | Import via `@/assets/*`                                                                          |
| Global store (only once approved)         | `src/store/`                                           | Zustand only; see [07 §6](07-data-state.md)                                                      |
| E2E flow                                  | `.maestro/<flow>.yaml`                                 | One per user-visible feature; see [.maestro/AGENTS.md](../../.maestro/AGENTS.md)                 |
| Component/screen test                     | colocated `*.test.tsx` next to source                  | See [09](09-testing.md)                                                                          |

New folders: only a new module (via `pnpm new:module`), a new screen (via `pnpm new:screen`), a module's `domain/`, or a screen's first private component (`.../components/`). Never `src/features/`, `src/services/`, etc.

## 3. Naming and module conventions

- kebab-case files and folders outside `src/app/` — enforced by `check-file` (lint).
- Named exports only; `src/app/**` must default-export — enforced by `import/no-default-export` (lint). Details: [11 §7–8](11-typescript-style.md).
- Hooks: `use-<name>.ts` file, `use<Name>` export.
- No barrel files (`index.ts` re-exports). A screen's `index.tsx` _is_ the screen component, not a barrel.
- Styles: [03 §9](03-ui-design-system.md#9-stylesheet-conventions). `testID`s: [03 §10](03-ui-design-system.md#10-accessibility--testid-summary--full-rules-in-file-12).

## 4. CNG — native projects are generated, never edited

- `ios/` and `android/` come from `npx expo prebuild` (`pnpm prebuild` = `--clean`) and are git-ignored. Hand edits are destroyed on the next prebuild.
- All native configuration goes through `app.config.ts` and config plugins ([08 §1–3](08-native-config.md)). If a library needs native setup, find or write a config plugin — never paste native code.
- Native packages: always `npx expo install <pkg>` (SDK-58-compatible version), then `pnpm doctor:expo`.
- A new native dependency, config plugin change, or `app.config.ts` / `eas.json` change changes the fingerprint → **store release, not OTA**. Say so in the PR description. CI labels the PR `fingerprint:changed` / `fingerprint:compatible` ([10](10-ci-release.md)).
- Local builds are free: `pnpm build:dev:ios` / `pnpm build:dev:android`. Don't trigger EAS cloud builds casually (Free plan).

## 5. Environment variables & runtime config

- Client code reads config only through `env` from [src/lib/env.ts](../../src/lib/env.ts). `process.env` elsewhere and destructuring `process.env` are lint errors (`process.env.EXPO_OS` is allowed; `src/app/api/**` is exempt).
- `EXPO_PUBLIC_*` values are inlined by Metro at build time — they are public plaintext in the bundle. Secrets: [13 §1](13-security.md).
- Inside `env.ts`, reference each variable statically with dot notation (`process.env.EXPO_PUBLIC_API_URL`). Bracket access and destructuring are not inlined → `undefined` at runtime.
- Changing a value needs a rebundle + full reload; it is not a runtime lookup.
- `.env` resolution (SDK 58): development loads `.env.development.local` → `.env.local` → `.env.development` → `.env`; production analogously. Nonstandard names like `.env.staging` are NOT loaded. `.env*.local` is git-ignored.
- **Every `env` value is optional and never throws.** EAS Update bundles (PR previews, production OTA) are built without `.env` or `eas.json` `env`, so a value that throws when missing crashes every update on launch (#18). The feature that needs a value checks for it and degrades: hide the feature or fail with a clear error (`isApiConfigured()` / `ApiNotConfiguredError` in `api.ts`).
- New variable checklist (add to `env` with `optional()`, `.env.example`, the code path that handles it being unset): [src/lib/AGENTS.md](../../src/lib/AGENTS.md). EAS environments: [08 §9](08-native-config.md).

```ts
// ✅ src/lib/env.ts — the single access point
export const env = {
  apiUrl: optional(process.env.EXPO_PUBLIC_API_URL), // string | undefined
} as const;

// ❌ inside env.ts
const url = process.env['EXPO_PUBLIC_API_URL']; // not inlined → undefined
required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL); // throws in EAS Update bundles
```

## 6. Server API routes (`src/app/api/*+api.ts`)

Rules live in [07 §10](07-data-state.md) (handlers, secrets, no platform extensions), [13 §8](13-security.md) (security) and [14 §7](14-errors-resilience.md) (error shape); essentials in [src/app/AGENTS.md](../../src/app/AGENTS.md). One extra trap: API routes are bundled to CJS — no ESM-only output, no dynamic imports, and avoid deps with platform binaries (e.g. `sharp`).

## 7. Platform-specific code

Targets are **iOS and Android only** — there is no web UI ([ADR 0001](../decisions/0001-modules-sqlite-native-only.md)). `app.config.ts` keeps `web.output: 'server'` only so API routes work. Never add `.web.tsx` / `.web.ts` files.

- **Small differences:** `Platform.select` / `Platform.OS` inline.
- **Large differences:** sibling files `file.ios.tsx` / `file.android.tsx` (or one of them + a default `file.tsx`). All variants export the same name with **identical props**, so call sites stay platform-agnostic. Change them together.
- In `src/app/`, a platform route (`about.ios.tsx`) is allowed only if the universal `about.tsx` exists — Expo Router needs it for deep linking. PREFER splitting in `src/components/` and importing the split component from a single route.

```tsx
// ✅ small diff
padding: Platform.select({ ios: Spacing.three, default: Spacing.two }),

// ✅ big diff: src/components/map-view.tsx + map-view.ios.tsx, same `MapView` export and props

// ❌ src/app/map.ios.tsx without src/app/map.tsx (breaks universal routing)
// ❌ any *.web.tsx file — web is not a target
```

## 8. Data, UI, and state placement

Moved to the owning rulebooks: data and state → [07](07-data-state.md), UI → [03](03-ui-design-system.md).

## 9. Do-not-trust-training-data corrections

The general list lives in [AGENTS.md](../../AGENTS.md#expo-has-changed--do-not-trust-your-training-data). Additionally: global `expo-cli` is deprecated — always `npx expo <cmd>`.

## Common agent mistakes

1. Writing screen JSX directly in `src/app/*.tsx` instead of the module's `screens/` (or `src/screens/` for shell screens).
2. Editing or committing `ios/`/`android/`; suggesting `expo eject`.
3. `pnpm add expo-camera` instead of `npx expo install expo-camera`; using npm/yarn at all.
4. Importing one screen's component from another screen's folder, or one module from another, instead of promoting the shared piece.
5. React/RN imports or I/O in `src/utils/`.
6. New top-level `src/` folders (`features/`, `services/`) or barrel `index.ts` files.
7. A platform-split route in `src/app/` without the universal (non-suffixed) file; adding `.web.tsx` files.
8. Not stating in the PR that a native-dep / plugin / `app.config.ts` change forces a store release.
