// PreToolUse(Bash): agents never change git state in this repo (AGENTS.md § Git).
// The deny list in settings.json matches command text only; this catches the bypass
// forms it misses: `/usr/bin/git`, `git -C . push`, `sh -c "git ..."`, chained commands.
// Read-only git (status, diff, log, show, blame) stays allowed.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = String(input.tool_input?.command ?? '');

const MUTATING_GIT =
  /(?:^|[\s;&|()`'"/])git\b(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+(add|am|apply|checkout|switch|restore|reset|revert|rebase|merge|cherry-pick|commit|push|pull|stash|tag|rm|mv|clean|init|worktree|filter-branch|update-ref)\b/;
const MUTATING_GH = /\bgh\s+(?:pr\s+(?:create|merge|ready|close|edit)|repo\s+(?:create|delete))\b/;

const match = command.match(MUTATING_GIT) ?? command.match(MUTATING_GH);
if (match) {
  console.error(
    `Blocked: "${match[0].trim()}" changes git/GitHub state. In this repo the user runs git. ` +
      'Hand over a suggested branch name, a paste-ready commit message and PR text instead ' +
      '(.github/instructions/ticket-workflow.instructions.md). Read-only git (status/diff/log) is fine.',
  );
  process.exit(2);
}
