# Branch rulesets

`main.json` is the source of truth for protecting `main`. GitHub does not read this folder —
apply it once (and again after every change) from a machine where `gh` is logged in as the
repo owner:

```bash
gh api repos/{owner}/{repo}/rulesets --method POST --input .github/rulesets/main.json
```

What it enforces:

- No direct pushes, force pushes or deletion of `main`; linear history; squash merges only.
- Every change goes through a PR; code-owner review is required, so anything touching the
  guardrail paths in `CODEOWNERS` (agent rules, CI, lint, EAS config) needs the maintainer.
- `required_approving_review_count: 0` keeps a solo maintainer unblocked on their own PRs,
  while `require_last_push_approval` means a PR pushed by an agent or bot still needs a human.
- Required checks: CI and the security workflow. Context names must match the job `name:`
  fields in `.github/workflows/`; keep them in sync when renaming jobs.
- The repository admin role (`actor_id: 5`) may bypass via PR only, never by pushing directly.

Notes:

- Rulesets on **private** repos of a free personal account may require GitHub Pro (not
  verified); on public repos they are free.
- `actor_id: 5` for the admin role is from GitHub's docs examples (not verified here); check
  the created ruleset in Settings → Rules after applying.
