// Scaffolds a Hive module (a mini-app) in the shape docs/agent-rules/01 and src/modules/AGENTS.md
// require, registers it on Home and generates its first database migration:
//   pnpm new:module habits
// Generated code passes `pnpm check` as-is. Nothing existing is ever overwritten.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  fail,
  format,
  invalidateRouteTypes,
  KEBAB,
  names,
  root,
  run,
  writeAll,
} from './scaffold-utils.mjs';

const [id] = process.argv.slice(2);
if (!id || !KEBAB.test(id) || id === 'registry') {
  fail('Usage: pnpm new:module <kebab-case-id>   e.g. pnpm new:module habits');
}
const { pascal, camel, snake, title } = names(id);

const schema = `import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ${title} tables. Every table name starts with \`${snake}_\` so modules never collide in hive.db.
// After changing this file run \`pnpm db:generate\` and commit the new migration (07 §8).

export const ${camel}Items = sqliteTable('${snake}_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});
`;

const queries = `import { queryOptions, useQuery } from '@tanstack/react-query';
import { desc } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';

import { ${camel}Items } from './schema';

export type ${pascal}Item = typeof ${camel}Items.$inferSelect;

// Hierarchical key factory — every key for this module comes from here (07 §1).
export const ${camel}Keys = {
  all: ['${id}'] as const,
  items: () => [...${camel}Keys.all, 'items'] as const,
};

// Shared queryOptions: the same definition for useQuery, prefetchQuery and tests.
export const ${camel}ItemsQuery = () =>
  queryOptions({
    queryKey: ${camel}Keys.items(),
    queryFn: async (): Promise<${pascal}Item[]> =>
      getDb().select().from(${camel}Items).orderBy(desc(${camel}Items.createdAt)).all(),
  });

export function use${pascal}Items() {
  return useQuery(${camel}ItemsQuery());
}
`;

const homeScreen = `import { FlatList, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassCard } from '@/components/ui/glass-card';
import { LoadingState } from '@/components/ui/loading-state';
import { Wallpaper } from '@/components/ui/wallpaper';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { type ${pascal}Item, use${pascal}Items } from '../../data/queries';

/** ${title}'s entry screen. The Stack header shows the title (src/app/${id}/index.tsx). */
export function ${pascal}Home() {
  return (
    <Wallpaper style={styles.container} testID="${id}-screen">
      <${pascal}Content />
    </Wallpaper>
  );
}

// Four states, data first: cached data stays visible if a refetch fails (07 §1, 14 §3).
function ${pascal}Content() {
  const { data, error, isError, refetch } = use${pascal}Items();

  if (data) {
    if (data.length === 0) {
      return <EmptyState title="Nothing here yet" testID="${id}-empty" />;
    }
    return (
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        testID="${id}-list"
      />
    );
  }
  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} testID="${id}-error" />;
  }
  return <LoadingState testID="${id}-loading" />;
}

const keyExtractor = (item: ${pascal}Item) => item.id;

const renderItem = ({ item }: { item: ${pascal}Item }) => (
  <GlassCard testID={\`${id}-item-\${item.id}\`}>
    <ThemedText>{item.title}</ThemedText>
  </GlassCard>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
`;

const homeTest = `import { render, screen } from '@testing-library/react-native';

import { ApiError } from '@/lib/api';

import { ${pascal}Home } from './index';
import { use${pascal}Items } from '../../data/queries';

// The database boundary: the module's query hooks (09 §5). Domain logic is tested without mocks.
jest.mock('../../data/queries');
const mockedItems = jest.mocked(use${pascal}Items);
const result = (value: object) => value as ReturnType<typeof use${pascal}Items>;

describe('${pascal}Home', () => {
  it('renders the stored items', async () => {
    mockedItems.mockReturnValue(
      result({ data: [{ id: '1', title: 'First item', createdAt: new Date(0) }] }),
    );
    await render(<${pascal}Home />);

    expect(screen.getByText('First item')).toBeOnTheScreen();
  });

  it('shows the empty state when nothing is stored', async () => {
    mockedItems.mockReturnValue(result({ data: [] }));
    await render(<${pascal}Home />);

    expect(screen.getByTestId('${id}-empty')).toBeOnTheScreen();
  });

  it('shows a retryable error with friendly copy', async () => {
    mockedItems.mockReturnValue(
      result({ isError: true, error: new ApiError(500, 'SELECT failed'), refetch: jest.fn() }),
    );
    await render(<${pascal}Home />);

    expect(screen.getByTestId('${id}-error')).toBeOnTheScreen();
    expect(screen.queryByText(/SELECT failed/)).not.toBeOnTheScreen();
  });
});
`;

const route = `import { Stack } from 'expo-router';

import { ${pascal}Home } from '@/modules/${id}/screens/home';

export default function ${pascal}Route() {
  return (
    <>
      <Stack.Screen options={{ title: '${title}' }} />
      <${pascal}Home />
    </>
  );
}
`;

const flow = `# ${title}: opens from its Home card and renders.
appId: com.ruvceski.hive.dev
tags:
  - ${id}
---
- launchApp
- tapOn:
    id: 'home-open-${id}'
- assertVisible:
    id: '${id}-screen'
`;

const files = [
  [`src/modules/${id}/data/schema.ts`, schema],
  [`src/modules/${id}/data/queries.ts`, queries],
  [`src/modules/${id}/screens/home/index.tsx`, homeScreen],
  [`src/modules/${id}/screens/home/index.test.tsx`, homeTest],
  [`src/app/${id}/index.tsx`, route],
  [`.maestro/${id}.yaml`, flow],
];
writeAll(files);
invalidateRouteTypes();

// Register on Home (default order = registry order; users can reorder/hide).
const registryPath = join(root, 'src/modules/registry.ts');
const registry = readFileSync(registryPath, 'utf8');
const entry = `  {
    id: '${id}',
    title: '${title}',
    description: '${title} module.',
    icon: { ios: 'square.grid.2x2', android: 'apps', web: 'apps' },
    href: '/${id}',
  },
`;
const declaration = /(export const hiveModules: readonly HiveModule\[\] = \[)([\s\S]*?)(\];)/;
if (!declaration.test(registry)) fail('Could not find hiveModules in src/modules/registry.ts');
writeFileSync(
  registryPath,
  registry.replace(
    declaration,
    (_, open, body, close) =>
      `${open}\n${body.trim() ? `${body.trimEnd()}\n` : ''}${entry}${close}`,
  ),
);

format([...files.map(([path]) => path), 'src/modules/registry.ts']);
run('drizzle-kit', ['generate', '--name', `${snake}_init`]);

console.warn(`
Created module ${title} (${id}), registered it on Home and generated its first migration.

Next steps:
1. Set the real description and icon in src/modules/registry.ts.
2. Replace the sample \`${snake}_items\` table, then \`pnpm db:generate\` (review the SQL before committing).
3. Add screens with \`pnpm new:screen ${id}/<name>\`; put pure logic in src/modules/${id}/domain/ with tests.
4. pnpm check — then rebuild the dev client only if you added a native dependency.`);
