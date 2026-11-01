# AGENTS.md — Hive

Hive is an Expo / React Native app (iOS + Android only — web is not a target) built with Expo SDK 58,
Expo Router and TypeScript. It is a home for mini-apps ("modules": Health, Habits, Money, Wallet,
Books…) that keep all data on the phone in SQLite ([ADR 0001](docs/decisions/0001-modules-sqlite-native-only.md)).
It is developed by people and AI agents together; these rules apply to both. **All repo and GitHub
content is in English** (code, docs, commits, issues, PRs, comments); only live chat may differ.

**Detailed rulebooks live in [docs/agent-rules/](docs/agent-rules/README.md).** Before working on a
feature, open the index there and read the files for the domains you'll touch (architecture,
navigation, UI/design system, responsive layout, performance, app size, data/state, native config,
testing, CI/release, TypeScript style, accessibility). This file is the summary; those files are
the law.

**Directory rules are closest-file-wins:** `src/app/`, `src/modules/`, `src/screens/`, `src/components/`,
`src/lib/` and `.maestro/` each have a short AGENTS.md with what matters when you edit files there.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or
removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with
   corrections to common LLM misconceptions. Follow its links to the specific page you need; never
   answer from memory.

Known traps in this exact dependency set:

- `@testing-library/react-native` v14: `render()` is **async** — always `await render(...)`, then
  query via `screen`. Matchers are built in; there is no `extend-expect` import.
- `eslint` is pinned to 9.x because `eslint-config-expo` targets it. Do not bump to 10.
- React Compiler is on (`experiments.reactCompiler`). Do not call `setState` synchronously inside
  `useEffect`; use `useSyncExternalStore` or derive state instead.
- There is no `expo eject`, no "managed vs bare". `ios/` and `android/` are generated (CNG) and
  git-ignored. Never create or edit them by hand — use `app.config.ts` and config plugins.

## Commands

```bash
pnpm install                  # pnpm only (packageManager field). Never npm/yarn.
npx expo install <pkg>        # ALWAYS for expo-*/react-native-* packages — resolves SDK-compatible versions
pnpm add <pkg>                # pure-JS packages only (no native code)
pnpm start                    # dev server (needs an installed dev build; Expo Go can't run this app)
pnpm ios | pnpm android       # build + run a dev build on the simulator/emulator (macOS)
pnpm typecheck                # tsc --noEmit
pnpm lint | pnpm lint:fix     # expo lint
pnpm test                     # jest (unit + component)
pnpm check                    # typecheck + lint + test + docs:check — run before declaring any task done
pnpm test:e2e                 # maestro flows in .maestro/ against an installed dev build
pnpm doctor:expo              # expo-doctor — run after any dependency change
pnpm deps:check               # expo install --check — must be clean before a PR
pnpm new:module <id>          # scaffold a module: schema, queries, home screen + tests, route, Maestro
                              # flow; registers it on Home and runs db:generate
pnpm new:screen <id>/<name>   # module screen + test + route /<id>/<name> (`<name>` alone: shell screen)
pnpm db:generate              # drizzle-kit: schema changes → new migration in src/lib/db/migrations/
```

Run `pnpm check` before declaring any task done. The pre-commit hook
runs lint-staged and typecheck; do not bypass it with `--no-verify`.

## Features

Feature work follows `.claude/skills/implement-feature/SKILL.md` (plans: `create-tech-plan`), with
three user checkpoints: plan, structure, handoff. Specs come from `.github/ISSUE_TEMPLATE/feature.yml`.
New modules start from `pnpm new:module`, new screens from `pnpm new:screen`, never from a blank file.

## Definition of done

- `pnpm check` passes (typecheck + lint with `--max-warnings 0` + Jest). One file:
  `pnpm test src/utils/format-date.test.ts`. CI also enforces the coverage ratchet via
  `pnpm test:coverage` — thresholds in `package.json` only ever go up.
- The handoff shows evidence: the commands you ran and their result. For UI changes, a
  screenshot per platform you actually ran; name any platform you did not run, and why.
- A bug fix comes with a test that fails before the fix and passes after it.
- Claude Code enforces this with hooks in `.claude/settings.json` (lint on edit, `pnpm check`
  before finishing, guards for git and test tampering). Other agents: CI is the backstop.

## Exemplars — copy these shapes

- Thin route: `src/app/settings.tsx`. Launcher screen (four states, fixed header, Dock): `src/screens/home/`.
- SQLite data hook (key factory, `queryOptions`): `src/screens/home/use-home-layout.ts`; with an optimistic mutation: `src/hooks/use-app-settings.ts`.
- Pure logic + test: `src/screens/home/home-groups.ts`. Remote hook: `src/screens/settings/use-health.ts`.
- Loading / error / empty states: `src/components/ui/{loading,error,empty}-state.tsx`.
- Tests: `src/components/ui/error-state.test.tsx` (component), `src/screens/home/index.test.tsx`
  (data hooks mocked), `src/screens/settings/index.test.tsx` (fresh QueryClient, `@/lib/api` mocked).

## Boundaries

- **Always:** run `pnpm check`; add a `testID` to interactive elements; use theme tokens.
- **Ask first:** adding any dependency; touching `app.config.ts`, `eas.json`, CI/EAS workflows,
  lint/TS/Jest config or `docs/agent-rules/`; anything that forces a store release.
- **Never:** change git state; edit/skip/delete a test to make it pass; add `eslint-disable`,
  `@ts-ignore` or `any`; edit `ios/`/`android/`; put secrets in `EXPO_PUBLIC_*`.

## Project structure (do not reorganize)

```
src/
  app/          Expo Router routes ONLY. Every file here is a route. Keep them thin:
                read params, set screen options, render a screen from src/modules or src/screens.
    <id>/       A module's routes: index.tsx (entry) + <screen>.tsx.
    api/        Server API routes (`*+api.ts`). Run on the server, never in the bundle.
  modules/      Mini-apps. registry.ts lists them for Home. Each <id>/ has data/ (schema.ts,
                queries.ts), screens/<name>/ and domain/ (pure logic). Never import each other.
  screens/      Shell screens only (Home launcher, Settings). Private parts in ./components/.
  components/   Reusable UI (button, card…). kebab-case files, one named export each.
    ui/         Lower-level primitives.
  hooks/        Reusable hooks.
  lib/          App infrastructure: db/ (getDb, core schema, migrations), api, env, query client.
  utils/        Pure helpers. Tests colocated: foo.ts + foo.test.ts.
  constants/    Theme tokens (colors, spacing, fonts).
  types/        Ambient type declarations.
assets/         Images, fonts.
.maestro/       E2E flows.
.eas/workflows/ EAS Workflows (deploy). .github/workflows/ — GitHub Actions (CI, PR previews).
```

Platform-specific code: use `Platform.select` for small differences; for larger ones create
`file.ios.tsx` / `file.android.tsx` next to a default `file.tsx` with identical props. Web is not a
target: no `.web.tsx` files (`web.output: 'server'` exists only for API routes). Styles live in a `StyleSheet.create` at the bottom of the component file. No separate
`.styles.ts` files.

## Navigation

Expo Router. Import `Link`, `router`, `useLocalSearchParams`, `Stack` from `expo-router`. The root
`src/app/_layout.tsx` is a plain `<Stack />` — no tabs. Home (`/`, header hidden) shows app groups
as cards, pinned apps in a Dock (`home-dock-<id>` links to `/<id>`) and a Settings button (`/settings`).
Typed routes are enabled; never build hrefs from untyped strings.

## Data

- Local-first: one SQLite database (`hive.db`, expo-sqlite + Drizzle ORM), opened lazily by
  `getDb()` (`src/lib/db/client.ts`). Module tables in `src/modules/<id>/data/schema.ts`, prefixed
  `<id_snake>_`; core tables in `src/lib/db/schema.ts`. After a schema change run `pnpm db:generate`
  and commit the migration — never hand-edit `src/lib/db/migrations/`. The root layout applies
  migrations before rendering.
- Reads/writes go through TanStack Query hooks (`useThing`, `useCreateThing`) in the module's
  `data/queries.ts` (`networkMode: 'always'`). Components never call `getDb()` or `fetch`.
- Remote (future integrations only): `api<T>()` from `src/lib/api.ts`, opting into `networkMode: 'online'`.
- Runtime config: `src/lib/env.ts`. Only `EXPO_PUBLIC_*` variables reach the client bundle; they
  are inlined at build time. Never put secrets in them.
- Client state: React state / context first. If a global store becomes necessary, add Zustand and
  put stores in `src/store/`. Do not introduce Redux/MobX.

## UI

- Use `ThemedText` / `ThemedView` and the tokens in `src/constants/theme.ts`. No hardcoded colors
  or magic spacing numbers.
- Prefer `@expo/ui` (SwiftUI / Jetpack Compose) for native controls: sheets, pickers, switches,
  menus. Fall back to React Native built-ins only when `@expo/ui` lacks the component.
- Animations: Reanimated + Gesture Handler. Never the legacy `Animated` API.
- Images: `expo-image`, never RN `Image`.
- Every interactive or asserted element gets a stable `testID` (kebab-case). Maestro and RNTL
  both rely on them.
- Respect safe areas (`react-native-safe-area-context`) and dark mode on every screen. Target iOS
  and Android only — no web breakpoints, hover or keyboard-nav work.

## Testing

- Unit/component: Jest (`jest-expo` preset) + RNTL. Colocate `*.test.ts(x)` with the source.
  Test behavior through `testID`/text/role queries, not implementation details. expo-sqlite has no
  Jest implementation: mock the data hooks (`jest.mock('../../data/queries')`) and test pure
  `domain/` logic directly.
- Never edit, skip or delete a test to make it pass. If the spec and a test conflict, stop and
  report the conflict. Snapshots and Maestro screenshot baselines are updated by the user only.
- E2E: Maestro flows in `.maestro/`. Add a flow when you add a user-visible feature.
- When verifying on a device/simulator, use `agent-device` (installed globally) to open the app,
  read the accessibility snapshot, tap, and capture screenshots as evidence.

## Releases (how code reaches users)

- PR → GitHub Actions run CI (`ci.yml`) and publish an EAS Update preview with a QR code
  (`preview.yml`). Reviewers open it in a development build.
- Merge to `main` → `.eas/workflows/deploy-to-production.yml` fingerprints native code. If the
  fingerprint matches an existing production build, it publishes an OTA update (minutes). If not,
  it builds and submits to both stores.
- Therefore: any change to native deps, config plugins, `app.config.ts`, or `eas.json` means a
  store release. Say so in the PR description.
- Builds for local testing are free and unlimited: `pnpm build:dev:ios`, `pnpm build:dev:android`
  (`eas build --local`). Cloud builds are limited on the Free plan — do not trigger them casually.

## Git

- Local agents do not change git state in this repo (read-only `status`/`diff`/`log` is fine) —
  prepare changes and hand over paste-ready branch/commit/PR text; the user runs git. Claude Code
  enforces this via `.claude/settings.json` + hooks. The Copilot cloud agent commits to its own
  branch through its harness; that is the one exception. Full ticket-to-PR process:
  [.github/instructions/ticket-workflow.instructions.md](.github/instructions/ticket-workflow.instructions.md).
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `ci:`). No AI attribution in commits/PRs: no `Co-authored-by:` trailer or "Generated with …" line for Copilot, Claude or any AI tool. The PR body becomes the squash commit on `main`, so this covers it too; CI (`pr-hygiene.yml`) and the `commit-msg` hook enforce it.
- Small PRs, one concern each. Agent-authored PRs open as drafts.
- Never commit: `ios/`, `android/`, `.env`, credentials, `google-service-account.json`.

## When unsure

Check the installed Expo Skills (`expo-overview` first) and the Expo MCP server before adding a
dependency or guessing an API. If the docs and this file disagree, the docs win — then fix this
file in the same PR.
