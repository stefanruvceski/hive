import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SwipeRow } from '@/components/ui/swipe-row';
import { type SwipeSide } from '@/utils/swipe';

import { type Category, useArchiveCategory, useCategories } from '../../data/queries';
import { Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';
import { useMoneyView } from '../components/use-money-view';

/** The categories of the open space: a list; the + adds one and a row opens it. */
export function MoneyCategories() {
  const categories = useCategories();
  const scope = useMoneyView();
  const startSpace = scope.view === 'all' || scope.view === 'private' ? 'private' : 'business';
  const [space, setSpace] = useState<Category['space'] | null>(null);
  const shown = space ?? startSpace;
  return (
    <MoneyScreen
      id="money-categories"
      title="Categories"
      trailing={
        <GlassButton
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          label="Add category"
          onPress={() => router.push({ pathname: '/money/category', params: { space: shown } })}
          testID="money-categories-add"
        />
      }>
      <Gate queries={[categories, ...scope.queries]} id="money-categories">
        <SegmentedControl
          options={spaceOptions}
          value={shown}
          onChange={setSpace}
          label="Category list"
          testID="money-categories-space"
        />
        <CategoryList categories={(categories.data ?? []).filter((c) => c.space === shown)} />
      </Gate>
    </MoneyScreen>
  );
}

const spaceOptions = [
  { value: 'private', label: 'Private' },
  { value: 'business', label: 'Business' },
] as const;

const archiveIcon = { ios: 'archivebox', android: 'archive', web: 'archive' } as const;
const restoreIcon = { ios: 'arrow.uturn.backward', android: 'restore', web: 'restore' } as const;

function CategoryList({ categories }: { categories: Category[] }) {
  const archive = useArchiveCategory();
  const [open, setOpen] = useState<{ id: string; side: SwipeSide } | null>(null);
  const edit = (id: string) => router.push({ pathname: '/money/category', params: { id } });
  return (
    <>
      {(['expense', 'income'] as const).map((section) => (
        <Group key={section} title={section === 'expense' ? 'Expenses' : 'Income'}>
          {categories
            .filter((c) => c.kind === section)
            .map((c) => (
              <SwipeRow
                key={c.id}
                open={open?.id === c.id ? open.side : null}
                onOpenChange={(side) => setOpen(side ? { id: c.id, side } : null)}
                onEdit={() => edit(c.id)}
                onArchive={() => archive.mutate({ id: c.id, archived: !c.archivedAt })}
                archiveLabel={c.archivedAt ? 'Restore' : 'Archive'}
                archiveIcon={c.archivedAt ? restoreIcon : archiveIcon}
                enabled
                name={c.name}
                testID={`money-category-${c.id}`}>
                <Pressable
                  role="button"
                  aria-label={`Edit ${c.name}`}
                  onPress={() => edit(c.id)}
                  testID={`money-category-edit-${c.id}`}
                  style={styles.row}>
                  <ThemedText themeColor={c.archivedAt ? 'textTertiary' : 'text'}>
                    {`${c.emoji} ${c.name}${c.archivedAt ? ' (archived)' : ''}`}
                  </ThemedText>
                </Pressable>
              </SwipeRow>
            ))}
        </Group>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 48, justifyContent: 'center' },
});
