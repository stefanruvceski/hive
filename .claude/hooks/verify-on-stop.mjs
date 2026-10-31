// Stop: "done" means `pnpm check` passes (AGENTS.md § Commands). Runs only when files
// changed this session (marker written by format-edited.mjs), so plain Q&A stays fast.
// Exit 2 sends the failure back to the agent; stop_hook_active prevents an endless loop.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const marker = join(projectDir, '.claude', '.dirty');

if (input.stop_hook_active || !existsSync(marker)) process.exit(0);

const result = spawnSync('pnpm', ['check'], {
  cwd: projectDir,
  encoding: 'utf8',
  timeout: 280_000,
});

if (result.status !== 0) {
  const output = `${result.stdout}${result.stderr}`.split('\n').slice(-60).join('\n');
  console.error(`pnpm check failed — the task is not done until it passes:\n${output}`);
  process.exit(2);
}

rmSync(marker, { force: true });
