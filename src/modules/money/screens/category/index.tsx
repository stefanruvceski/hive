import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { SaveButton } from '@/components/ui/save-button';
import { SegmentedControl } from '@/components/ui/segmented-control';

import { type Category, useCategories, useSaveCategory } from '../../data/queries';
import { type CategoryKind } from '../../data/schema';
import { nameTaken, normalizeName } from '../../domain/categories';
import { Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

const spaceOptions = [
  { value: 'private', label: 'Private' },
  { value: 'business', label: 'Business' },
] as const;

type Props = { id?: string; space: Category['space'] };

/** Add a category, or rename one (`id`). Private has its own list; every business shares one. */
export function MoneyCategory({ id, space }: Props) {
  const categories = useCategories();
  const title = id ? 'Edit category' : 'New category';
  // The form starts from the saved category, so it waits until the list has loaded.
  if (!categories.data) {
    return (
      <MoneyScreen id="money-category" title={title}>
        <Gate queries={[categories]} id="money-category">
          {null}
        </Gate>
      </MoneyScreen>
    );
  }
  return <CategoryForm categories={categories.data} id={id} startSpace={space} title={title} />;
}

function CategoryForm({
  categories,
  id,
  startSpace,
  title,
}: {
  categories: Category[];
  id?: string;
  startSpace: Category['space'];
  title: string;
}) {
  const save = useSaveCategory();
  const editing = categories.find((c) => c.id === id) ?? null;
  const [space, setSpace] = useState(editing?.space ?? startSpace);
  const [kind, setKind] = useState<CategoryKind>(editing?.kind ?? 'expense');
  const [name, setName] = useState(editing?.name ?? '');
  const [emoji, setEmoji] = useState(editing?.emoji ?? '🏷️');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const clean = normalizeName(name);
    if (!clean) return setError('A category needs a name.');
    const others = categories.filter((c) => c.space === space && c.id !== editing?.id);
    if (nameTaken(others, kind, clean)) return setError('That name is already used.');
    save.mutate(
      { id: editing?.id, space, kind, name: clean, emoji: emoji.trim() || '🏷️' },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <MoneyScreen
      id="money-category"
      title={title}
      trailing={
        <SaveButton onPress={submit} disabled={save.isPending} testID="money-category-save" />
      }>
      {editing ? null : (
        <>
          <SegmentedControl
            options={spaceOptions}
            value={space}
            onChange={setSpace}
            label="Category list"
            testID="money-category-space"
          />
          <SegmentedControl
            options={kindOptions}
            value={kind}
            onChange={setKind}
            label="Category type"
            testID="money-category-kind"
          />
        </>
      )}
      <Group title="Category">
        <Field
          label="Emoji"
          value={emoji}
          onChangeText={setEmoji}
          maxLength={4}
          testID="money-category-emoji"
        />
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Name"
          testID="money-category-name"
        />
        {error ? (
          <ThemedText themeColor="danger" role="alert" testID="money-category-error">
            {error}
          </ThemedText>
        ) : null}
      </Group>
    </MoneyScreen>
  );
}
