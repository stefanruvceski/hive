// PreToolUse(Edit|MultiEdit|Write): stop the two ways agents most often "pass" without
// fixing the code — weakening tests and silencing tools (docs/agent-rules/09, 11, 14).
// Hard blocks exit 2; config and test-weakening edits ask the user instead.
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const tool = input.tool_input ?? {};
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const file = relative(projectDir, String(tool.file_path ?? ''));

const edits = Array.isArray(tool.edits)
  ? tool.edits
  : [{ old_string: tool.old_string ?? '', new_string: tool.new_string ?? tool.content ?? '' }];
const added = edits.map((e) => e.new_string ?? '').join('\n');
const removed = edits.map((e) => e.old_string ?? '').join('\n');
const count = (text, re) => (text.match(re) ?? []).length;

function block(reason) {
  console.error(`Blocked edit to ${file}: ${reason}`);
  process.exit(2);
}

function ask(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

if (/(^|\/)__snapshots__\//.test(file) || /^\.maestro\/.*\.png$/.test(file)) {
  block('snapshots and Maestro screenshot baselines are test oracles; the user updates them.');
}

const isCode = /\.(ts|tsx|js|mjs|cjs)$/.test(file) && !file.startsWith('.claude/');
if (isCode) {
  const banned = [
    [/\b(?:it|test|describe)\.(?:only|skip)\(|\bx(?:it|test|describe)\(/, 'focused/skipped tests'],
    [/eslint-disable/, 'eslint-disable comments — fix the code (rule 11 §13)'],
    [/@ts-ignore|@ts-nocheck/, '@ts-ignore/@ts-nocheck — use a typed fix (rule 11 §1)'],
    [/\bas any\b|:\s*any\b/, '`any` — narrow from `unknown` instead (rule 11 §1)'],
  ];
  for (const [re, what] of banned) {
    if (count(added, new RegExp(re, 'g')) > count(removed, new RegExp(re, 'g'))) {
      block(`adds ${what}. If this is genuinely unavoidable, explain why and ask the user.`);
    }
  }
}

const isTest = /\.test\.(ts|tsx)$/.test(file);
if (isTest && existsSync(tool.file_path ?? '')) {
  const before = tool.content !== undefined ? readFileSync(tool.file_path, 'utf8') : removed;
  if (count(added, /\bexpect\(/g) < count(before, /\bexpect\(/g)) {
    ask(
      `This edit removes assertions from ${file}. Do not change tests to make them pass — ` +
        'if the spec and the test conflict, report the conflict instead.',
    );
  }
}

const guardedConfig = [
  /^eslint\.config\.js$/,
  /^tsconfig\.json$/,
  /^jest\.setup\.ts$/,
  /^\.husky\//,
  /^\.github\/workflows\//,
  /^\.eas\/workflows\//,
  /^\.claude\//,
];
if (guardedConfig.some((re) => re.test(file))) {
  ask(
    `${file} is a guardrail (lint/types/tests/CI/agent config). Confirm this change is intended.`,
  );
}
