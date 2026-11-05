import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { SaveButton } from '@/components/ui/save-button';

import { type BusinessRow, useBusinesses, useSaveBusiness } from '../../data/business-queries';
import { normalizeName } from '../../domain/categories';
import { isValidPib, normalizePib } from '../../domain/owners';
import { Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';

/** Add a business, or rename one (`id`). The PIB (tax number) is what tells two apart. */
export function MoneyBusiness({ id }: { id?: string }) {
  const businesses = useBusinesses();
  const title = id ? 'Edit business' : 'New business';
  // The form starts from the saved business, so it waits until the list has loaded.
  if (!businesses.data) {
    return (
      <MoneyScreen id="money-business" title={title}>
        <Gate queries={[businesses]} id="money-business">
          {null}
        </Gate>
      </MoneyScreen>
    );
  }
  return <BusinessForm rows={businesses.data} id={id} title={title} />;
}

function BusinessForm({ rows, id, title }: { rows: BusinessRow[]; id?: string; title: string }) {
  const save = useSaveBusiness();
  const editing = rows.find((row) => row.id === id) ?? null;
  const [name, setName] = useState(editing?.name ?? '');
  const [pib, setPib] = useState(editing?.pib ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const cleanName = normalizeName(name);
    const cleanPib = normalizePib(pib);
    if (!cleanName) return setError('A business needs a name.');
    if (!cleanPib) return setError('The PIB is nine digits.');
    if (!isValidPib(cleanPib)) return setError('This PIB is not valid. Check the digits.');
    const same = rows.find((row) => row.pib === cleanPib && row.id !== editing?.id);
    if (same) return setError(`This PIB is already ${same.name}.`);
    setError(null);
    save.mutate(
      { id: editing?.id, name: cleanName, pib: cleanPib },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <MoneyScreen
      id="money-business"
      title={title}
      trailing={
        <SaveButton onPress={submit} disabled={save.isPending} testID="money-business-save" />
      }>
      <Group title="Business">
        <Field
          label="Business name"
          value={name}
          onChangeText={setName}
          placeholder="Name"
          testID="money-business-name"
        />
        <Field
          label="PIB"
          value={pib}
          onChangeText={setPib}
          placeholder="PIB (9 digits)"
          keyboardType="number-pad"
          maxLength={11}
          testID="money-business-pib"
        />
        {error ? (
          <ThemedText themeColor="danger" role="alert" testID="money-business-error">
            {error}
          </ThemedText>
        ) : null}
      </Group>
    </MoneyScreen>
  );
}
