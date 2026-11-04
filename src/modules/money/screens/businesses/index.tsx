import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';

import {
  type BusinessRow,
  useArchiveBusiness,
  useBusinesses,
  useSaveBusiness,
} from '../../data/business-queries';
import { normalizeName } from '../../domain/categories';
import { isValidPib, normalizePib } from '../../domain/owners';
import { Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';

/** The user's businesses. The PIB (tax number) is what tells two apart, so each is added once. */
export function MoneyBusinesses() {
  const businesses = useBusinesses();
  return (
    <MoneyScreen id="money-businesses" title="Businesses">
      <Gate queries={[businesses]} id="money-businesses">
        <BusinessList rows={businesses.data ?? []} />
      </Gate>
    </MoneyScreen>
  );
}

function BusinessList({ rows }: { rows: BusinessRow[] }) {
  const save = useSaveBusiness();
  const archive = useArchiveBusiness();
  const [editing, setEditing] = useState<BusinessRow | null>(null);
  const [name, setName] = useState('');
  const [pib, setPib] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEditing(null);
    setName('');
    setPib('');
    setError(null);
  };
  const edit = (row: BusinessRow) => {
    setEditing(row);
    setName(row.name);
    setPib(row.pib);
    setError(null);
  };
  const submit = () => {
    const cleanName = normalizeName(name);
    const cleanPib = normalizePib(pib);
    if (!cleanName) return setError('A business needs a name.');
    if (!cleanPib) return setError('The PIB is nine digits.');
    if (!isValidPib(cleanPib)) return setError('This PIB is not valid. Check the digits.');
    const same = rows.find((row) => row.pib === cleanPib && row.id !== editing?.id);
    if (same) return setError(`This PIB is already ${same.name}.`);
    setError(null);
    save.mutate({ id: editing?.id, name: cleanName, pib: cleanPib }, { onSuccess: reset });
  };

  return (
    <>
      <Group title={editing ? `Edit ${editing.name}` : 'Add a business'}>
        <Field
          label="Business name"
          value={name}
          onChangeText={setName}
          placeholder="Name"
          testID="money-businesses-name"
        />
        <Field
          label="PIB"
          value={pib}
          onChangeText={setPib}
          placeholder="PIB (9 digits)"
          keyboardType="number-pad"
          maxLength={11}
          testID="money-businesses-pib"
        />
        {error ? (
          <ThemedText themeColor="danger" role="alert" testID="money-businesses-error">
            {error}
          </ThemedText>
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton
            label={editing ? 'Save' : 'Add'}
            onPress={submit}
            testID="money-businesses-save"
          />
          {editing ? (
            <Pressable
              role="button"
              aria-label="Cancel"
              onPress={reset}
              testID="money-businesses-cancel"
              style={styles.link}>
              <ThemedText themeColor="accent">Cancel</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Group>
      <Group title="Your businesses">
        {rows.length === 0 ? (
          <ThemedText themeColor="textTertiary" testID="money-businesses-empty">
            No businesses yet. Add one to keep its money apart from your own.
          </ThemedText>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.row} testID={`money-business-${row.id}`}>
              <Pressable
                role="button"
                aria-label={`Edit ${row.name}`}
                onPress={() => edit(row)}
                testID={`money-business-edit-${row.id}`}
                style={styles.name}>
                <ThemedText themeColor={row.archivedAt ? 'textTertiary' : 'text'}>
                  {`${row.name}${row.archivedAt ? ' (archived)' : ''}`}
                </ThemedText>
                <ThemedText type="footnote" themeColor="textTertiary">
                  {`PIB ${row.pib}`}
                </ThemedText>
              </Pressable>
              <Pressable
                role="button"
                aria-label={`${row.archivedAt ? 'Restore' : 'Archive'} ${row.name}`}
                onPress={() => archive.mutate({ id: row.id, archived: !row.archivedAt })}
                testID={`money-business-archive-${row.id}`}
                style={styles.link}>
                <ThemedText themeColor="accent">
                  {row.archivedAt ? 'Restore' : 'Archive'}
                </ThemedText>
              </Pressable>
            </View>
          ))
        )}
      </Group>
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
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  name: { flex: 1, minHeight: 48, justifyContent: 'center' },
  link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.two },
});
