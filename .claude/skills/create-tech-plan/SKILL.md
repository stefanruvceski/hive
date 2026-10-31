---
name: create-tech-plan
description: Write an implementation plan for a Hive feature issue before any code is changed — files to touch, data shape, steps with verify commands, risks. Use when starting a multi-screen or multi-domain feature, or when the user asks for a plan.
---

# Create a tech plan

A plan is how the user steers the implementation before code exists. Keep it short enough to
review in two minutes; detail goes into the steps, not into prose.

## 1. Gather

1. Read the issue completely. If it lacks acceptance criteria, screens/data, out-of-scope or the
   native-change answer, stop and ask — don't fill gaps with guesses.
2. Read `AGENTS.md`, the `AGENTS.md` of every folder you will touch, and the rulebooks the
   index (`docs/agent-rules/README.md`) lists for those domains. Read `review-lessons.md`.
3. Read the code you will change and the closest existing example of the same shape
   (exemplars are listed in `AGENTS.md`). If the feature exists in `hive-poc`, read that
   implementation for behavior — not for structure.

## 2. Write the plan

Save `docs/plans/YYYY-MM-DD-HHmm-<feature>.yml` (git-ignored working doc):

```yaml
issue: 42
title: Mark habit done from Today
goal: <one sentence from the issue>
native_change: false # true ⇒ store release, say why
decisions_needed: # questions for the user BEFORE implementation; empty if none
  - Should completing a habit be undoable for the whole day or only 5 seconds?
data:
  shape: '{ habitId: string; date: string /* YYYY-MM-DD */ }'
  source: SQLite (habits_completions), no API
files:
  create: [src/modules/habits/screens/today/components/habit-row.tsx]
  change: [src/modules/habits/screens/today/index.tsx, src/modules/habits/data/queries.ts]
  must_not_change: [src/components/ui/*, navigation]
steps:
  - do: Add HabitRow with a checkbox (role=checkbox, testID habit-row-<id>)
    verify: pnpm test src/modules/habits
  - do: Optimistic toggle with rollback on failure
    verify: pnpm test src/modules/habits
  - do: Maestro flow mark-habit-done.yaml
    verify: pnpm test:e2e (on the simulator)
risks:
  - Streak calculation lives in two places today; reuse the util, don't copy it.
done_when:
  - pnpm check passes
  - each acceptance criterion maps to a test or a Maestro step
```

Rules for the plan:

- One step = one reviewable change with its own `verify:` command. No step without a check.
- Scaffold instead of hand-writing: `pnpm new:module <id>` for a new module, `pnpm new:screen
<module>/<name>` for a module screen.
- Data lives in SQLite: list new/changed Drizzle tables (prefixed `<module>_`) under `data`, and a
  step that runs `pnpm db:generate` and reviews the migration SQL. A table change on existing data
  needs a migration plan (defaults, backfill), never a dropped column without a decision.
- New dependency, permission, or `app.config.ts` / `eas.json` change ⇒ list it under
  `decisions_needed`; never decide it alone.
- Map every acceptance criterion to the test or Maestro step that proves it.

Also write `docs/plans/<same-name>.html`: one self-contained page (inline CSS, no external
assets) rendering the same content, so the user can read it in a browser.

## 3. Stop for review

Present the plan path, the `decisions_needed`, and anything you are unsure about. **Do not start
implementing until the user approves the plan.** When it is fully done, move both files to
`docs/plans/completed/`.
