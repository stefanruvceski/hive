// PostToolUse(Edit|MultiEdit|Write): format and lint only the file just edited, and mark
// the session dirty so the Stop hook knows a full check is needed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = String(input.tool_input?.file_path ?? '');
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

mkdirSync(join(projectDir, '.claude'), { recursive: true });
writeFileSync(join(projectDir, '.claude', '.dirty'), new Date().toISOString());

if (!existsSync(file) || file.includes('/node_modules/')) process.exit(0);

const bin = (name) => join(projectDir, 'node_modules', '.bin', name);
const run = (cmd, args) =>
  spawnSync(cmd, args, { cwd: projectDir, encoding: 'utf8', timeout: 50_000 });

if (/\.(ts|tsx|js|mjs|cjs)$/.test(file)) {
  const lint = run(bin('eslint'), ['--fix', '--max-warnings', '0', file]);
  if (lint.status !== 0) {
    console.error(`eslint reported problems in ${file} — fix them:\n${lint.stdout}${lint.stderr}`);
    process.exit(2);
  }
} else if (/\.(json|md|ya?ml|css)$/.test(file)) {
  run(bin('prettier'), ['--write', '--log-level', 'warn', file]);
}
