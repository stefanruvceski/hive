# src/modules — Hive mini-apps

Each folder is one module (Health, Habits, Money…), launched from Home. Start one with `pnpm new:module <id>` — never by hand. Rules: [01](../../docs/agent-rules/01-architecture.md), [07](../../docs/agent-rules/07-data-state.md); why: [ADR 0001](../../docs/decisions/0001-modules-sqlite-native-only.md).

## Anatomy

```
src/modules/<id>/
  data/schema.ts        Drizzle tables, every name prefixed `<id_snake>_` (habits → `habits_entries`)
  data/queries.ts       key factory + queryOptions + TanStack Query hooks over getDb()
  screens/<name>/       index.tsx (named export) + index.test.tsx; private parts in ./components/
  domain/               pure logic (no React, no database) + colocated *.test.ts
src/app/<id>/index.tsx  thin route → screens/home;  src/app/<id>/<name>.tsx → screens/<name>
.maestro/<id>.yaml      opens the module from Home: its group card, then its row in the group sheet
                        (`subflows/open-from-home.yaml`: `home-group-<group>` → `home-open-<id>`)
```

- **Isolation (lint).** A module never imports another module (`local/no-cross-module-imports`) or `src/app`. Shared code moves down to `src/components`, `src/hooks`, `src/lib` or `src/utils` — which in turn never import `src/modules`.
- **Registry.** `registry.ts` (`hiveModules`) is the shell's list: `id`, `title`, one-line `description` (the line under its name in the group sheet; never empty, `registry.test.ts`), `icon` (per-platform `SymbolView` name), `tint` (its `AppTints` color), `group` (its default Home group from `defaultHomeGroups`), `href`. Its order is the default order within a group; where the user moved, pinned or hid an app is stored in `home_apps`. It is not a module and is exempt from the isolation rule.
- **Data.** Screens read and write only through `data/queries.ts` hooks; components never call `getDb()`. A module touches only its own tables. Keys start with the module id. Four states on every data screen, data first ([07 §1](../../docs/agent-rules/07-data-state.md)).
- **Migrations.** Edit `data/schema.ts` → `pnpm db:generate` → review and commit the generated SQL in `src/lib/db/migrations/`. Never hand-edit migrations; destructive changes need a data-preserving migration — user data lives only on the device ([07 §8](../../docs/agent-rules/07-data-state.md)).
- **Tests.** expo-sqlite doesn't run in Jest: screen tests `jest.mock('../../data/queries')` and set hook return values; `domain/` logic is tested directly with no mocks ([09 §5](../../docs/agent-rules/09-testing.md)).
- **Screens.** `pnpm new:screen <id>/<name>` adds screen + test + route `/<id>/<name>`; then link to it with `<Link href="/<id>/<name>">`.
