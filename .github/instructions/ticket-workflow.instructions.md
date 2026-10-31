---
description: 'Hive ticket workflow: GitHub issues, branches, plans, implementation, PR prep. Agents never run git here.'
applyTo: '**'
# Process doc for implementation tasks — keep it out of Copilot code review context.
excludeAgent: 'code-review'
---

# Ticket workflow (Hive)

Adapted from the CareScout workflow rules for this repo's reality: GitHub (not ADO/GitLab),
solo maintainer, and a hard rule that **agents never run git**.

## Hard boundary: git

- Local agents (Claude Code, Cursor, Codex CLI) NEVER change git state in this repo — no
  add/commit/push/checkout/reset/stash, not even via subagents. Read-only `git status/diff/log`
  is fine. The user does all git operations. For Claude Code this is enforced by
  `.claude/settings.json` deny rules plus the `.claude/hooks/guard-git.mjs` hook.
- At the end of a task, hand over: suggested branch name, paste-ready
  `git commit -m "<message>"`, and a paste-ready PR title + description. Nothing more.

## Tickets (GitHub Issues)

- Every implementation task is tracked by a GitHub issue before code changes start. If none
  exists, draft one (title + body) for the user to create — or create it only if explicitly
  asked.
- English only: titles, bodies, comments, labels and milestones — even when the user talks to
  you in another language. Translate their words; don't paste them.
- Epics are issues labeled `epic`; their stories are linked as sub-issues. Each story carries a
  `feature`/`bug`/`chore` label, one `module:<id>` or `area:<name>` label and, when planned, a
  milestone.
- Never write a story straight from a vague prompt. Interview first: the user-facing goal, who
  the user is, where it lives (screen/route/platform), and what done looks like; what must not
  change (shared components, navigation, API contracts, theme tokens).
- Acceptance criteria in Given/When/Then. Check against INVEST (fits one PR, estimable). Flag
  unknowns with ⚠️.
- Bugs: identify the root cause area first and classify it (code / config / content / data) in
  the issue body.

## Branches & commits

- Branch per task, named with the issue number: `feat/42-hive-list`, `fix/57-dark-mode-link`.
- A feature spanning multiple repos uses the **same branch name** in each repo.
- Conventional Commits with the issue number: `feat: add hive list screen (#42)`. Derive the
  number from the branch name or ask.

## Plans

- Plans follow the in-repo `create-tech-plan` skill
  ([.claude/skills/create-tech-plan/SKILL.md](../../.claude/skills/create-tech-plan/SKILL.md)) —
  never `create-plan`. Agents without skill support read that file as a document.
- The full feature process, with the user's approval checkpoints, is the `implement-feature`
  skill ([.claude/skills/implement-feature/SKILL.md](../../.claude/skills/implement-feature/SKILL.md));
  feature issues use [.github/ISSUE_TEMPLATE/feature.yml](../ISSUE_TEMPLATE/feature.yml).
- Artifacts live in-repo but are git-ignored:

  ```
  docs/plans/YYYY-MM-DD-HHmm-<feature>.yml    (machine-readable)
  docs/plans/YYYY-MM-DD-HHmm-<feature>.html   (self-contained viewer)
  docs/plans/plan-runs/                        (run logs/reports)
  docs/plans/completed/                        (move both files here when fully done)
  ```

- Post-plan-run deliverables (run reports, QA/verification reports, handoffs) are
  self-contained HTML, not markdown. Markdown only for the in-run working ledger.
- A plan is required for multi-screen/multi-domain features; small fixes go straight to
  implementation.

## Implementation flow

1. Read the [docs/agent-rules/](../../docs/agent-rules/README.md) files for every domain the
   task touches (the index says when each applies).
2. Read [docs/agent-rules/review-lessons.md](../../docs/agent-rules/review-lessons.md) —
   accepted findings from past PR reviews. Treat every active entry as a rule; repeating a
   ledger mistake is an automatic review blocker.
3. Implement following the rules; copy the in-repo exemplars (four-state primitives,
   `use-health` data slice, test patterns) instead of inventing new shapes.
4. `pnpm lint:fix` after creating files (Windows CRLF), then `pnpm check` must pass.
5. Dependency changed? `pnpm deps:check` and `pnpm doctor:expo` must be clean; state the size delta
   and whether the fingerprint moved (store release) — see agent-rules/06 and 10.
6. Verify visually when UI changed: web via browser (light + dark, breakpoints), device via
   `agent-device` when a dev build is available. New user-visible feature ⇒ Maestro flow.

## PR review findings → ledger

- When a review finding on a PR is **accepted** (fix applied, or the maintainer agrees it was
  a real miss), append it to
  [docs/agent-rules/review-lessons.md](../../docs/agent-rules/review-lessons.md) following the
  entry format and lifecycle rules there (dedup → bump `Seen`; 2+ occurrences → promote to a
  rulebook or lint rule and delete the entry).
- The ledger is committed — include the entry in the same PR when possible.

## PR prep (user opens the PR)

- Fill every section of [.github/pull_request_template.md](../pull_request_template.md) from
  the actual diff, not the ticket title. "Areas affected / verify after merge" is mandatory
  and concrete (screens, flows, platforms to re-check).
- Include `Closes #<issue>` in the body. Flag "requires store release" in the first line when
  native config/deps changed.
- One concern per PR; propose splitting otherwise.

## Post-run efficiency review

After long runs (plan executions, multi-step tasks, long debugging), analyse the run for time
and token inefficiencies: repeated tool calls, re-reads of large files, oversized outputs,
avoidable full-suite runs where targeted tests would do, subagent overuse, instruction gaps
that caused rework. Report the top findings and record durable lessons in repo memory (or
propose AGENTS.md / agent-rules updates) so the next run avoids them.
