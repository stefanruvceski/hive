// Hive modules (src/modules/<id>/) are independent mini-apps: one module never imports another.
// Shared code moves down to src/components, src/hooks, src/lib or src/utils (docs/agent-rules/01).
// `src/modules/registry.ts` is the shell's list of modules, not a module, so it is exempt.
const path = require('node:path');

const MODULE_FILE = /[\\/]src[\\/]modules[\\/]([^\\/]+)[\\/]/;

/** @param {string} source @param {string} filename */
function targetModule(source, filename) {
  if (source.startsWith('@/modules/')) return source.split('/')[2] ?? null;
  if (source.startsWith('.')) {
    const match = path.resolve(path.dirname(filename), source).match(MODULE_FILE);
    return match ? match[1] : null;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow imports between Hive modules' },
    messages: {
      crossModule:
        'Module "{{from}}" must not import module "{{to}}" — move shared code to src/components, src/lib or src/utils (docs/agent-rules/01 §1).',
    },
    schema: [],
  },
  create(context) {
    const own = context.filename.match(MODULE_FILE)?.[1];
    if (!own) return {};
    return {
      ImportDeclaration(node) {
        const to = targetModule(String(node.source.value), context.filename);
        if (to && to !== own && to !== 'registry' && to !== 'registry.ts') {
          context.report({ node, messageId: 'crossModule', data: { from: own, to } });
        }
      },
    };
  },
};
