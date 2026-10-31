# Contributing

1. Read [AGENTS.md](./AGENTS.md) — it is the rulebook for humans and agents alike.
2. Branch from `main`: `feat/<short-name>`, `fix/<short-name>`.
3. Commit with Conventional Commits. The pre-commit hook runs lint-staged and typecheck.
4. Open a PR using the template. CI and an EAS Update preview run automatically.
5. One approving review from a code owner is required. Agent-authored PRs start as drafts.
6. Squash-merge. Merging to `main` deploys (OTA update, or store build when native code changed).

Adding a dependency:

- Native / `expo-*` → `npx expo install <pkg>` and say so in the PR (forces a store build).
- Pure JS → `pnpm add <pkg>`.
- Run `pnpm doctor:expo` and `pnpm deps:check` afterwards.
