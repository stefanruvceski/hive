// RuleTester specs for the repo-local ESLint rules. A rule without a test can be
// "fixed" by weakening it — keep both in the same PR.
const { RuleTester } = require('eslint');

const noColorLiterals = require('./no-color-literals');
const noCrossModuleImports = require('./no-cross-module-imports');
const requireTestId = require('./require-testid');

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run('require-testid', requireTestId, {
  valid: [
    '<Pressable testID="save-hive" onPress={save} />',
    '<TextInput testID={`${id}-name`} />',
    '<Pressable {...props} />',
    '<View />',
  ],
  invalid: [
    { code: '<Pressable onPress={save} />', errors: [{ messageId: 'missing' }] },
    { code: '<Switch value={on} />', errors: [{ messageId: 'missing' }] },
  ],
});

ruleTester.run('no-color-literals', noColorLiterals, {
  valid: [
    'const s = { backgroundColor: theme.background };',
    "const id = 'abc';",
    "const label = 'red alert';",
  ],
  invalid: [
    { code: "const s = { color: '#fff' };", errors: [{ messageId: 'literal' }] },
    {
      code: "const s = { backgroundColor: 'rgba(0,0,0,0.5)' };",
      errors: [{ messageId: 'literal' }],
    },
    { code: "const s = { borderColor: 'black' };", errors: [{ messageId: 'literal' }] },
  ],
});

ruleTester.run('no-cross-module-imports', noCrossModuleImports, {
  valid: [
    {
      code: "import { x } from '@/modules/habits/data/queries';",
      filename: '/repo/src/modules/habits/screens/today.tsx',
    },
    {
      code: "import { x } from '../data/queries';",
      filename: '/repo/src/modules/habits/screens/today.tsx',
    },
    {
      code: "import { hiveModules } from '@/modules/registry';",
      filename: '/repo/src/modules/habits/screens/today.tsx',
    },
    {
      code: "import { x } from '@/lib/db/client';",
      filename: '/repo/src/modules/habits/data/queries.ts',
    },
    {
      code: "import { x } from '@/modules/money/data';",
      filename: '/repo/src/screens/home/index.tsx',
    },
  ],
  invalid: [
    {
      code: "import { x } from '@/modules/money/data/queries';",
      filename: '/repo/src/modules/habits/screens/today.tsx',
      errors: [{ messageId: 'crossModule' }],
    },
    {
      code: "import { x } from '../../money/domain/totals';",
      filename: '/repo/src/modules/habits/screens/today.tsx',
      errors: [{ messageId: 'crossModule' }],
    },
  ],
});
