---
name: implement-feature
description: The Hive process for taking a feature issue from spec to a reviewed handoff — plan, user checkpoints, test-first implementation, verification on the simulator, paste-ready commit/PR text. Use whenever implementing a GitHub feature issue or any user-visible change.
---

# Implement a feature

The user wants to be involved in every feature. This process has **three checkpoints where you
stop and wait for approval**; never skip them, even when the change looks obvious.

## 1. Understand → checkpoint A

1. Read the issue (`.github/ISSUE_TEMPLATE/feature.yml` shape). Missing acceptance criteria,
   data source, out-of-scope or native-change answer ⇒ ask before anything else.
2. Small change (one screen, no new data shape) ⇒ write a 5-line plan in chat. Anything bigger ⇒
   run the `create-tech-plan` skill.
3. **Checkpoint A:** show the plan and `decisions_needed`. Wait for approval.

## 2. Shape → checkpoint B

1. New module ⇒ `pnpm new:module <id>` (registers it on Home, adds a route, a Maestro flow and its
   first migration). New screen ⇒ `pnpm new:screen <module>/<name>`, then `<Link>` to it from the
   screen that opens it. The root is a plain Stack — there are no tabs to wire.
2. Define the data shape first — Drizzle tables in `src/modules/<id>/data/schema.ts` (prefixed
   with the module id), then `pnpm db:generate` and read the generated SQL; query keys and hooks in
   `data/queries.ts`; the component tree — no logic yet.
3. **Checkpoint B:** show the file tree, the types and the component outline. Wait for approval.
   This is where structure gets fixed; changing it later is expensive.

## 3. Build test-first

For each plan step:

1. Write the test that encodes the acceptance criterion; run it and see it fail for the right
   reason.
2. Implement until it passes. Follow the folder `AGENTS.md` and copy the exemplars.
3. Run the step's `verify:` command.

Never edit, skip or delete a test to make it pass — if the spec and a test conflict, stop and
report it (docs/agent-rules/09 §1).

## 4. Verify

1. `pnpm check` passes (typecheck + lint + test + docs check).
2. UI change ⇒ run it on the simulator: the golden path, empty state, error state, dark mode,
   large text. Take screenshots of what you verified; name platforms you did not run.
3. User-visible flow ⇒ the Maestro flow covers the "How to verify" steps from the issue; remove
   its `wip` tag once the screen is reachable.
4. Native change ⇒ the handoff says **requires store release** and why.

## 5. Handoff → checkpoint C

Agents never change git state here. Hand over, in one message:

- Branch name: `feat/<issue>-<slug>` (or `fix/…`).
- Commit message (Conventional Commits, with the issue number): `feat: … (#42)`.
- PR title and body filling every section of `.github/pull_request_template.md`, with
  `Closes #<issue>` and the evidence (commands run + screenshots).
- Anything left undone or unverified, stated plainly.
- If the change alters a screen's look: pull the current design canvas into `docs/design/canvas/`
  (see `docs/design/README.md`) so the PR carries the design it was built from.
- No AI attribution anywhere (no `Co-authored-by:` trailer, no "Generated with …" line).

**Checkpoint C:** the user reviews and runs git. If they accept a review finding, record it in
`docs/agent-rules/review-lessons.md`.
