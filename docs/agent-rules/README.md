# Agent Rules — Index

Mandatory rulebooks for anyone (human or AI agent) writing code in this repo. [AGENTS.md](../../AGENTS.md) is the entry point; these files are the detailed law per domain. When starting a feature, read the files relevant to what you're touching — when in doubt, read 01, 03, 05 and 11 at minimum.

| #   | File                                                         | Read when you…                                                                                                              |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 01  | [01-architecture.md](01-architecture.md)                     | add/move any file or module; decide where code lives; touch env, CNG, API routes, platform files                            |
| 02  | [02-navigation.md](02-navigation.md)                         | add/change routes, module routes, modals, links, params, guards (Expo Router)                                               |
| 03  | [03-ui-design-system.md](03-ui-design-system.md)             | build any UI: theme tokens, ThemedText/View, @expo/ui, expo-image, Reanimated, testIDs                                      |
| 04  | [04-responsive-adaptive.md](04-responsive-adaptive.md)       | lay out any screen: breakpoints, safe areas, orientation, keyboard, font scaling, large screens                             |
| 05  | [05-performance.md](05-performance.md)                       | write components, lists, animations, queries — anything that renders or fetches                                             |
| 06  | [06-app-size.md](06-app-size.md)                             | add a dependency, asset, or font; analyze/export bundles                                                                    |
| 07  | [07-data-state.md](07-data-state.md)                         | read/write SQLite (Drizzle, migrations), add hooks, manage state, call remote APIs                                          |
| 08  | [08-native-config.md](08-native-config.md)                   | touch app.config.ts, eas.json, config plugins, permissions, or any native dep                                               |
| 09  | [09-testing.md](09-testing.md)                               | write/modify tests (Jest + RNTL v14 async render, Maestro flows)                                                            |
| 10  | [10-ci-release.md](10-ci-release.md)                         | prepare a PR/commit; understand OTA vs store release, fingerprints, EAS profiles                                            |
| 11  | [11-typescript-style.md](11-typescript-style.md)             | write any TS/TSX: strictness, naming, exports, React 19 + React Compiler rules                                              |
| 12  | [12-accessibility-platform.md](12-accessibility-platform.md) | ship any UI: a11y API, touch targets, reduce motion, iOS/Android conventions                                                |
| 13  | [13-security.md](13-security.md)                             | handle secrets, tokens, auth, deep links, WebViews, API routes, new deps, PII/logging                                       |
| 14  | [14-errors-resilience.md](14-errors-resilience.md)           | handle failures: error boundaries, query/mutation errors, retry policy, offline, OTA recovery, logging, API error contracts |
| —   | [review-lessons.md](review-lessons.md)                       | **always, before implementing** — accepted PR review findings; active entries are rules                                     |

Before any rulebook, the nearest directory `AGENTS.md` applies: [src/app](../../src/app/AGENTS.md), [src/modules](../../src/modules/AGENTS.md), [src/screens](../../src/screens/AGENTS.md), [src/components](../../src/components/AGENTS.md), [src/lib](../../src/lib/AGENTS.md), [.maestro](../../.maestro/AGENTS.md). They hold the few rules that matter in that folder and link here for detail.

Architecture decisions behind these rules are recorded in [docs/decisions/](../decisions/0001-modules-sqlite-native-only.md) (ADR 0001: modules, local SQLite, iOS + Android only).

Ground rules for using these docs:

- Rules marked **(lint)**, **(TS)**, **(hook)** or **(CI)** are enforced by tooling — the prose only explains why. When a prose-only rule keeps being broken, promote it to a check (see [review-lessons.md](review-lessons.md) lifecycle) instead of adding emphasis.
- `pnpm docs:check` (part of `pnpm check` and CI) verifies that links and `pnpm` commands in these files exist and that always-loaded files stay short.

- Rules here are grounded in the installed versions (see `package.json`) and the versioned Expo/RN docs. If a rule conflicts with current official docs for the installed version, the docs win — update the rule file in the same PR.
- Each file has a **Non-negotiables** checklist at the top; treat it as a pre-merge gate for changes in that domain.
- Don't duplicate rules across files when extending them — cross-reference instead.
