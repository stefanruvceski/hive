// https://docs.expo.dev/guides/using-eslint/
/* global __dirname */
const pluginQuery = require('@tanstack/eslint-plugin-query');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const checkFile = require('eslint-plugin-check-file');
const jest = require('eslint-plugin-jest');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

const local = {
  rules: {
    'require-testid': require('./eslint/rules/require-testid'),
    'no-color-literals': require('./eslint/rules/no-color-literals'),
    'no-cross-module-imports': require('./eslint/rules/no-cross-module-imports'),
  },
};

// Shared so file-scoped blocks that add selectors don't drop these (later blocks override).
const reactSyntaxBans = [
  {
    selector:
      "MemberExpression[object.name='React'][property.name=/^(useMemo|useCallback|memo|forwardRef)$/]",
    message: 'React Compiler memoizes; ref is a prop (docs/agent-rules/05, 11).',
  },
  {
    selector: "TSQualifiedName[left.name='React'][right.name=/^(FC|FunctionComponent)$/]",
    message: 'Type props directly instead of React.FC (docs/agent-rules/11 §2).',
  },
];

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  ...pluginQuery.configs['flat/recommended-strict'],
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'ios/*',
      'android/*',
      'coverage/*',
      'expo-env.d.ts',
      'src/lib/db/migrations/*',
    ],
  },
  {
    // An eslint-disable that no longer suppresses anything is an error, not noise.
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    rules: {
      // Import order and no cycles (docs/agent-rules/11 §6).
      'import/no-cycle': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // Named exports only; src/app routes are exempted below (docs/agent-rules/11).
      'import/no-default-export': 'error',
      // Dependency direction: app → screens → components → hooks → lib → utils/constants
      // (docs/agent-rules/01 §layering). target = restricted folder, from = forbidden source.
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/screens',
              from: './src/app',
              message: 'Screens must not import route files (app → screens, never back).',
            },
            {
              target: './src/modules',
              from: './src/app',
              message: 'Modules must not import route files (app → modules, never back).',
            },
            {
              target: './src/components',
              from: ['./src/app', './src/screens', './src/modules'],
              message: 'Reusable components sit below modules, screens and routes.',
            },
            {
              target: './src/hooks',
              from: ['./src/app', './src/screens', './src/modules', './src/components'],
              message: 'Hooks must not import UI layers or modules.',
            },
            {
              target: './src/lib',
              from: [
                './src/app',
                './src/screens',
                './src/modules',
                './src/components',
                './src/hooks',
              ],
              message: 'lib is infrastructure — no UI, module or hook imports.',
            },
            {
              target: './src/utils',
              from: [
                './src/app',
                './src/screens',
                './src/modules',
                './src/components',
                './src/hooks',
                './src/lib',
              ],
              message: 'utils are pure helpers with no app-layer imports.',
            },
          ],
        },
      ],
      // Enforced picks from docs/agent-rules/03-05.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Image', 'ImageBackground'],
              message: 'Use expo-image instead (docs/agent-rules/03).',
            },
            {
              name: 'react-native',
              importNames: ['Animated', 'Easing'],
              message: 'Use react-native-reanimated instead (docs/agent-rules/03).',
            },
            {
              name: 'react-native',
              importNames: ['Dimensions'],
              message: 'Use useWindowDimensions instead (docs/agent-rules/04).',
            },
            {
              name: 'react-native',
              importNames: ['useColorScheme'],
              message:
                'Use @/hooks/use-color-scheme, the one place to change scheme logic (docs/agent-rules/03).',
            },
            {
              name: 'react',
              importNames: ['useMemo', 'useCallback', 'memo'],
              message: 'React Compiler memoizes for you (docs/agent-rules/05, 11 §11).',
            },
            {
              name: 'react',
              importNames: ['forwardRef', 'FC', 'FunctionComponent'],
              message:
                'React 19: ref is a prop; type props directly (docs/agent-rules/11 §2, §10).',
            },
          ],
        },
      ],
      'no-restricted-syntax': ['error', ...reactSyntaxBans],
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    // Type-aware checks and testIDs for app code (docs/agent-rules/03 §10, 11).
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: __dirname } },
    plugins: { local },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { allowDefaultCaseForExhaustiveSwitch: false, considerDefaultExhaustiveForUnions: false },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true },
      ],
      'local/require-testid': 'error',
      'local/no-cross-module-imports': 'error',
    },
  },
  {
    // Network access has exactly one home (docs/agent-rules/07 §3).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/api.ts', 'src/app/api/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Use api<T>() from @/lib/api inside a query hook (docs/agent-rules/07 §3).',
        },
      ],
    },
  },
  {
    // Env access has exactly one home (docs/agent-rules/01 §5). Server routes may read secrets.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/env.ts', 'src/app/api/**'],
    rules: {
      // process.env.EXPO_OS is a build-time platform constant, not configuration.
      'no-restricted-syntax': [
        'error',
        ...reactSyntaxBans,
        {
          selector:
            "MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env'][property.name!='EXPO_OS']",
          message: 'Read config via `env` from @/lib/env (docs/agent-rules/01 §5).',
        },
        {
          selector:
            "VariableDeclarator > MemberExpression.init[object.name='process'][property.name='env']",
          message: 'Destructuring process.env is not inlined by Expo (docs/agent-rules/01 §5).',
        },
      ],
    },
  },
  {
    // Colors come from theme tokens (docs/agent-rules/03 §1).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/constants/theme.ts'],
    plugins: { local },
    rules: { 'local/no-color-literals': 'error' },
  },
  {
    // kebab-case files and folders (docs/agent-rules/01 §3). Expo Router names are exempt.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/**'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': ['error', { 'src/**/': 'KEBAB_CASE' }],
    },
  },
  {
    // Hook scripts talk to Claude Code over stdout.
    files: ['.claude/hooks/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // Tests must assert something (docs/agent-rules/09).
    ...jest.configs['flat/recommended'],
    files: ['**/*.test.{ts,tsx,js}'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/expect-expect': ['error', { assertFunctionNames: ['expect', 'ruleTester.run'] }],
      'jest/no-large-snapshots': ['error', { maxSize: 50 }],
    },
  },
  {
    // Expo Router resolves routes via default exports; config files follow tool conventions.
    files: ['src/app/**', '*.config.{js,ts}', 'app.config.ts', 'src/types/**/*.d.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    // The wrapper itself must import the RN hook.
    files: ['src/hooks/use-color-scheme.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
