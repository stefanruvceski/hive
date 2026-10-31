# ADR 0001 — Modules, local SQLite, iOS + Android only

- **Date:** 2026-10-30
- **Status:** Accepted
- **Decided by:** the maintainer

## Context

Hive is a rewrite of [hive-poc](https://github.com/stefanruvceski/hive-poc), an Android/Kotlin app that bundled several personal mini-apps (Health, Habits, Money, Wallet, Books) and kept all data on the phone. The Expo template Hive started from had tab navigation, a web target and a remote-API-first data layer, none of which fit that product.

## Decision

1. **Hive is a home for mini-apps ("modules").** Home (`src/screens/home/`, route `src/app/index.tsx`) is a launcher: a grid of module cards from `src/modules/registry.ts`, reorderable and hideable in an edit mode, persisted in the `home_modules` table. Each module lives in `src/modules/<id>/` (`data/`, `screens/`, `domain/`) with thin routes in `src/app/<id>/`. Modules never import each other (lint: `local/no-cross-module-imports`). Navigation is a plain Expo Router `<Stack />`; tabs and the Explore screen were removed. Settings (`/settings`) opens from Home.
2. **Local data = expo-sqlite + Drizzle ORM.** One database, `hive.db`, opened lazily by `getDb()`. Tables are declared in Drizzle schemas (core: `src/lib/db/schema.ts`; modules: `src/modules/<id>/data/schema.ts`, prefixed `<id_snake>_`); `pnpm db:generate` produces migrations, applied by the root layout before any screen renders. TanStack Query stays as the cache over local reads with `networkMode: 'always'`. The remote `api<T>()` client and API routes remain for future integrations.
3. **Platforms: iOS + Android only.** No web UI: all `.web.*` files were removed and CI's bundle smoke check is `expo export --platform android`. `app.config.ts` keeps `web.output: 'server'` only so API routes keep working.

## Consequences

- New mini-apps start with `pnpm new:module <id>` (skeleton, registry entry, Maestro flow, first migration); module screens with `pnpm new:screen <id>/<name>`.
- `expo-sqlite` is a native dependency, so this change ships as a store release (not OTA); `babel.config.js` and `metro.config.js` exist so `.sql` migrations bundle.
- Schema changes always go through generated migrations (committed, never hand-edited); destructive changes need data-preserving migrations, since user data exists only on the device.
- Jest cannot run expo-sqlite: screen tests mock the data hooks; business logic lives in pure `domain/` code tested directly.
- Web-specific guidance (breakpoints for desktop, hover, keyboard navigation, document titles, SecureStore fallbacks, web bundles) no longer applies and was removed from the rulebooks.
- Rules: [01](../agent-rules/01-architecture.md), [02](../agent-rules/02-navigation.md), [07](../agent-rules/07-data-state.md), [src/modules/AGENTS.md](../../src/modules/AGENTS.md).
