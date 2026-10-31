// Colors come from theme tokens, never literals (docs/agent-rules/03 §1). The token
// file itself and app config are exempted in eslint.config.js.
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i;
const NAMED = new Set(['white', 'black', 'red', 'green', 'blue', 'gray', 'grey', 'transparent']);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow color literals outside src/constants/theme.ts' },
    messages: {
      literal:
        'Color literal "{{value}}" — use a token from useTheme()/Colors (docs/agent-rules/03 §1).',
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        const value = node.value.trim();
        const isColorProp =
          node.parent?.type === 'Property' && /colou?r$/i.test(node.parent.key?.name ?? '');
        if (COLOR.test(value) || (isColorProp && NAMED.has(value.toLowerCase()))) {
          context.report({ node, messageId: 'literal', data: { value } });
        }
      },
    };
  },
};
