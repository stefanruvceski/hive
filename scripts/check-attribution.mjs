// No AI attribution in commits or PRs (AGENTS.md "Git"). Squash merges use the PR body as the
// commit message on main, so CI checks the PR title/body and every commit; the commit-msg hook
// checks local commits. Reads the files given as arguments, or stdin when there are none.
//   node scripts/check-attribution.mjs .git/COMMIT_EDITMSG
//   printf '%s' "$BODY" | node scripts/check-attribution.mjs
import { readFileSync } from 'node:fs';

const TOOLS = 'claude|anthropic|copilot|openai|chatgpt|codex|gemini|cursor|devin|aider';
const PATTERNS = [
  new RegExp(`co-authored-by:.*(${TOOLS})`, 'i'),
  new RegExp(`generated (with|by)\\W+\\[?(${TOOLS})`, 'i'),
  /claude\.(ai|com)\/(code|claude-code)/i,
  /🤖/u,
];

const sources = process.argv.slice(2);
const texts = sources.length
  ? sources.map((file) => ({ name: file, text: readFileSync(file, 'utf8') }))
  : [{ name: 'stdin', text: readFileSync(0, 'utf8') }];

const hits = texts.flatMap(({ name, text }) =>
  text
    .split('\n')
    // Git comment lines in a commit message file never reach the commit.
    .filter((line) => !line.startsWith('#'))
    .filter((line) => PATTERNS.some((pattern) => pattern.test(line)))
    .map((line) => `${name}: ${line.trim()}`),
);

if (hits.length > 0) {
  console.error('AI attribution is not allowed in commits or PRs (AGENTS.md "Git"). Remove:');
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}
