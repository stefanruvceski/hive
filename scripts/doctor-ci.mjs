// CI wrapper for expo-doctor (#21). A PR must fail only for problems it introduces, but the
// "packages match the installed Expo SDK" check compares against the newest Expo patch release —
// it turns every PR red the day Expo publishes one. That check alone becomes a warning here; the
// weekly Renovate "Expo SDK patches" PR (full `pnpm doctor:expo`) is what fixes the drift.
// Every other doctor check still fails the job.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { root } from './scaffold-utils.mjs';

const VERSION_CHECK = 'Check that packages match versions required by installed Expo SDK';

const result = spawnSync(join(root, 'node_modules/.bin/expo-doctor'), [], {
  cwd: root,
  encoding: 'utf8',
});
const output = `${result.stdout}${result.stderr}`;
process.stdout.write(output);

if (result.status === 0) process.exit(0);

const failed = output
  .split('\n')
  .filter((line) => line.startsWith('✖'))
  .map((line) => line.slice(1).trim());

if (failed.length > 0 && failed.every((check) => check === VERSION_CHECK)) {
  console.log(
    `::warning title=Expo patch releases available::${VERSION_CHECK} — not blocking; ` +
      'the weekly Renovate "Expo SDK patches" PR updates them.',
  );
  process.exit(0);
}
process.exit(result.status ?? 1);
