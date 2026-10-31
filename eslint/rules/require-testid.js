// Every interactive element needs a stable testID — Maestro and RNTL rely on them
// (docs/agent-rules/03 §10, 12). Elements that spread props are skipped: the testID
// may arrive through the spread (see TabButton in app-tabs.web.tsx).
const INTERACTIVE = new Set([
  'Pressable',
  'TextInput',
  'Switch',
  'TouchableOpacity',
  'TouchableHighlight',
]);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require a testID on interactive React Native elements' },
    messages: {
      missing: '<{{name}}> needs a stable kebab-case testID (docs/agent-rules/03 §10).',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || !INTERACTIVE.has(node.name.name)) return;
        const hasTestId = node.attributes.some(
          (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'testID',
        );
        const hasSpread = node.attributes.some((attr) => attr.type === 'JSXSpreadAttribute');
        if (!hasTestId && !hasSpread) {
          context.report({ node, messageId: 'missing', data: { name: node.name.name } });
        }
      },
    };
  },
};
