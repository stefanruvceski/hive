// Scaffolds a screen in the exact shape the rulebooks require:
//   pnpm new:screen habits/month     → module screen: src/modules/habits/screens/month + route /habits/month
//   pnpm new:screen about            → shell screen:  src/screens/about + route /about
// Screens start static (title + test). Data comes from the module's data/queries.ts hooks —
// copy the four-state pattern from the module's screens/home. Nothing existing is overwritten.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  fail,
  format,
  invalidateRouteTypes,
  KEBAB,
  names,
  root,
  writeAll,
} from './scaffold-utils.mjs';

const [arg] = process.argv.slice(2);
const parts = (arg ?? '').split('/');
if (parts.length > 2 || !parts.every((part) => KEBAB.test(part))) {
  fail('Usage: pnpm new:screen <module>/<screen>  or  pnpm new:screen <shell-screen>');
}
const [moduleId, screenName] = parts.length === 2 ? parts : [undefined, parts[0]];
if (moduleId && !existsSync(join(root, 'src/modules', moduleId))) {
  fail(`Module "${moduleId}" does not exist — create it first with pnpm new:module ${moduleId}`);
}

const { pascal, title } = names(screenName);
const component = moduleId ? `${names(moduleId).pascal}${pascal}` : pascal;
const testId = moduleId ? `${moduleId}-${screenName}` : screenName;
const screenDir = moduleId
  ? `src/modules/${moduleId}/screens/${screenName}`
  : `src/screens/${screenName}`;
const importPath = moduleId
  ? `@/modules/${moduleId}/screens/${screenName}`
  : `@/screens/${screenName}`;
const routePath = moduleId ? `src/app/${moduleId}/${screenName}.tsx` : `src/app/${screenName}.tsx`;

const screen = `import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export function ${component}() {
  return (
    <ThemedView style={styles.container} testID="${testId}-screen">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText themeColor="textSecondary">${title}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
`;

const test = `import { render, screen } from '@testing-library/react-native';

import { ${component} } from './index';

describe('${component}', () => {
  it('renders', async () => {
    await render(<${component} />);

    expect(screen.getByTestId('${testId}-screen')).toBeOnTheScreen();
  });
});
`;

const route = `import { Stack } from 'expo-router';

import { ${component} } from '${importPath}';

export default function ${component}Route() {
  return (
    <>
      <Stack.Screen options={{ title: '${title}' }} />
      <${component} />
    </>
  );
}
`;

const files = [
  [`${screenDir}/index.tsx`, screen],
  [`${screenDir}/index.test.tsx`, test],
  [routePath, route],
];
writeAll(files);
invalidateRouteTypes();
format(files.map(([path]) => path));

const href = moduleId ? `/${moduleId}/${screenName}` : `/${screenName}`;
console.warn(`
Created ${component} at ${href}.

Next steps:
1. Link to it: <Link href="${href}"> from the screen that opens it (typed routes, 02 §3).
2. Build the content; data goes through ${moduleId ? `src/modules/${moduleId}/data/queries.ts` : 'a hook next to the screen'} (07).
3. Cover the user journey in a Maestro flow (${moduleId ? `.maestro/${moduleId}.yaml` : `.maestro/${screenName}.yaml`}).
4. pnpm check`);
