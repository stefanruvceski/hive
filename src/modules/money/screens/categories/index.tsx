import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';

import {
  type Category,
  useArchiveCategory,
  useCategories,
  useSaveCategory,
} from '../../data/queries';
import { type CategoryKind } from '../../data/schema';
import { nameTaken, normalizeName } from '../../domain/categories';
import { Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';
import { useMoneyView } from '../components/use-money-view';

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

/** Manage the categories of the open space: add, rename, archive. */
export function MoneyCategories() {
  const categories = useCategories();
  const scope = useMoneyView();
  return (
    <MoneyScreen id="money-categories" title="Categories">
      <Gate queries={[categories, ...scope.queries]} id="money-categories">
        <CategoryLists
          categories={categories.data ?? []}
          startSpace={scope.view === 'all' || scope.view === 'private' ? 'private' : 'business'}
        />
      </Gate>
    </MoneyScreen>
  );
}

const spaceOptions = [
  { value: 'private', label: 'Private' },
  { value: 'business', label: 'Business' },
] as const;

// Private has its own list; every business shares the Business one.
function CategoryLists({
  categories,
  startSpace,
}: {
  categories: Category[];
  startSpace: Category['space'];
}) {
  const [space, setSpace] = useState(startSpace);
  return (
    <>
      <SegmentedControl
        options={spaceOptions}
        value={space}
        onChange={setSpace}
        label="Category list"
        testID="money-categories-space"
      />
      <CategoryList
        key={space}
        categories={categories.filter((c) => c.space === space)}
        space={space}
      />
    </>
  );
}

function CategoryList({ categories, space }: { categories: Category[]; space: Category['space'] }) {
  const save = useSaveCategory();
  const archive = useArchiveCategory();
  const [editing, setEditing] = useState<Category | null>(null);
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏷️');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEditing(null);
    setName('');
    setEmoji('🏷️');
    setError(null);
  };
  const submit = () => {
    const clean = normalizeName(name);
    if (!clean) return setError('A category needs a name.');
    const others = categories.filter((c) => c.id !== editing?.id);
    if (nameTaken(others, editing?.kind ?? kind, clean))
      return setError('That name is already used.');
    save.mutate(
      {
        id: editing?.id,
        space,
        kind: editing?.kind ?? kind,
        name: clean,
        emoji: emoji.trim() || '🏷️',
      },
      { onSuccess: reset },
    );
  };
  const edit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setEmoji(category.emoji);
    setError(null);
  };

  return (
    <>
      <Group title={editing ? `Edit ${editing.name}` : 'Add a category'}>
        {editing ? null : (
          <SegmentedControl
            options={kindOptions}
            value={kind}
            onChange={setKind}
            label="Category type"
            testID="money-categories-kind"
          />
        )}
        <Field
          label="Emoji"
          value={emoji}
          onChangeText={setEmoji}
          maxLength={4}
          testID="money-categories-emoji"
        />
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Name"
          testID="money-categories-name"
        />
        {error ? (
          <ThemedText themeColor="danger" role="alert" testID="money-categories-error">
            {error}
          </ThemedText>
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton
            label={editing ? 'Save' : 'Add'}
            onPress={submit}
            testID="money-categories-save"
          />
          {editing ? (
            <Pressable
              role="button"
              aria-label="Cancel"
              onPress={reset}
              testID="money-categories-cancel"
              style={styles.link}>
              <ThemedText themeColor="accent">Cancel</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Group>
      {(['expense', 'income'] as const).map((section) => (
        <Group key={section} title={section === 'expense' ? 'Expenses' : 'Income'}>
          {categories
            .filter((c) => c.kind === section)
            .map((c) => (
              <View key={c.id} style={styles.row} testID={`money-category-${c.id}`}>
                <Pressable
                  role="button"
                  aria-label={`Edit ${c.name}`}
                  onPress={() => edit(c)}
                  testID={`money-category-edit-${c.id}`}
                  style={styles.name}>
                  <ThemedText themeColor={c.archivedAt ? 'textTertiary' : 'text'}>
                    {`${c.emoji} ${c.name}${c.archivedAt ? ' (archived)' : ''}`}
                  </ThemedText>
                </Pressable>
                <Pressable
                  role="button"
                  aria-label={`${c.archivedAt ? 'Restore' : 'Archive'} ${c.name}`}
                  onPress={() => archive.mutate({ id: c.id, archived: !c.archivedAt })}
                  testID={`money-category-archive-${c.id}`}
                  style={styles.link}>
                  <ThemedText themeColor="accent">
                    {c.archivedAt ? 'Restore' : 'Archive'}
                  </ThemedText>
                </Pressable>
              </View>
            ))}
        </Group>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  name: { flex: 1, minHeight: 48, justifyContent: 'center' },
  link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.two },
});
