// Shared helpers for the scaffolding scripts (new-module.mjs, new-screen.mjs).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const root = resolve(dirname(new URL(import.meta.url).pathname), '..');

export const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function names(kebab) {
  const pascal = kebab.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
  return {
    kebab,
    pascal,
    camel: pascal[0].toLowerCase() + pascal.slice(1),
    snake: kebab.replace(/-/g, '_'),
    title: kebab.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
  };
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Writes all files or none: refuses if any path already exists. */
export function writeAll(files) {
  const clash = files.map(([path]) => path).filter((path) => existsSync(join(root, path)));
  if (clash.length) fail(`Refusing to overwrite existing files:\n- ${clash.join('\n- ')}`);
  for (const [path, content] of files) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}

export function run(bin, args) {
  const result = spawnSync(join(root, 'node_modules/.bin', bin), args, {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) fail(`${bin} ${args.join(' ')} failed`);
}

export function format(paths) {
  run('prettier', ['--write', '--log-level', 'warn', ...paths]);
}

/**
 * Typed-route declarations (.expo/types/router.d.ts) are regenerated only while the dev server
 * runs, so after adding routes the old file rejects the new hrefs. Removing it lets `tsc` fall
 * back to untyped routes until the next `pnpm start` writes a fresh one.
 */
export function invalidateRouteTypes() {
  rmSync(join(root, '.expo/types/router.d.ts'), { force: true });
}
