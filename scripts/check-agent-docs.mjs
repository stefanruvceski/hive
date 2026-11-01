// Keeps agent instructions honest (docs/agent-rules/README.md): rules that drift from the
// repo get followed anyway, so CI fails when they reference things that don't exist.
// Checks every AGENTS.md / CLAUDE.md / docs/agent-rules/*.md / .github/*instructions*.md:
//   - relative markdown links resolve to existing files;
//   - `pnpm <script>` mentions exist in package.json (or are pnpm built-ins);
//   - always-loaded files stay short (context budget).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const scripts = Object.keys(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts);
const PNPM_BUILTINS = new Set([
  'install',
  'i',
  'add',
  'remove',
  'update',
  'up',
  'dlx',
  'exec',
  'run',
  'why',
  'list',
  'ls',
  'dedupe',
  'audit',
  'approve-builds',
  'self-update',
  'config',
  'store',
  'outdated',
  'prune',
]);
// Always-loaded files share the context budget; rulebooks are read on demand.
const LIMITS = [
  [/^AGENTS\.md$/, 200],
  [/\/AGENTS\.md$/, 60],
  [/^CLAUDE\.md$/, 20],
  [/^\.github\/copilot-instructions\.md$/, 40],
  [/^docs\/agent-rules\/.+\.md$/, 260],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', '.expo', 'dist', 'coverage', 'ios', 'android'].includes(name))
      continue;
    const path = join(dir, name);
    // Claude Code session worktrees are whole copies of the repo, checked in their own runs.
    if (relative(root, path) === join('.claude', 'worktrees')) continue;
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const files = walk(root)
  .map((p) => relative(root, p))
  .filter(
    (p) =>
      /(^|\/)(AGENTS|CLAUDE)\.md$/.test(p) ||
      /^docs\/agent-rules\/.+\.md$/.test(p) ||
      /^\.github\/(copilot-instructions|instructions\/.+\.instructions)\.md$/.test(p),
  );

const problems = [];
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8');
  const lines = text.split('\n').length;
  const limit = LIMITS.find(([re]) => re.test(file))?.[1];
  if (limit && lines > limit) problems.push(`${file}: ${lines} lines (limit ${limit})`);

  const prose = text.replace(/```[\s\S]*?```/g, '');
  for (const [, target] of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = target.split('#')[0];
    if (path && !existsSync(resolve(root, dirname(file), path))) {
      problems.push(`${file}: broken link → ${target}`);
    }
  }
  for (const [, cmd] of text.matchAll(/`pnpm ([a-z][\w:-]*)/g)) {
    if (!scripts.includes(cmd) && !PNPM_BUILTINS.has(cmd)) {
      problems.push(`${file}: \`pnpm ${cmd}\` is not a package.json script`);
    }
  }
}

if (problems.length) {
  console.error(`Agent docs check failed (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.warn(`Agent docs OK (${files.length} files).`);
