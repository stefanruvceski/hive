import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { SwipeRow } from '@/components/ui/swipe-row';
import { type SwipeSide } from '@/utils/swipe';

import { type BusinessRow, useArchiveBusiness, useBusinesses } from '../../data/business-queries';
import { Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';

/** The user's businesses. The PIB (tax number) is what tells two apart, so each is added once. */
export function MoneyBusinesses() {
  const businesses = useBusinesses();
  return (
    <MoneyScreen
      id="money-businesses"
      title="Businesses"
      trailing={
        <GlassButton
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          label="Add business"
          onPress={() => router.push('/money/business')}
          testID="money-businesses-add"
        />
      }>
      <Gate queries={[businesses]} id="money-businesses">
        <BusinessList rows={businesses.data ?? []} />
      </Gate>
    </MoneyScreen>
  );
}

const archiveIcon = { ios: 'archivebox', android: 'archive', web: 'archive' } as const;
const restoreIcon = { ios: 'arrow.uturn.backward', android: 'restore', web: 'restore' } as const;

function BusinessList({ rows }: { rows: BusinessRow[] }) {
  const archive = useArchiveBusiness();
  const [open, setOpen] = useState<{ id: string; side: SwipeSide } | null>(null);
  const edit = (id: string) => router.push({ pathname: '/money/business', params: { id } });
  return (
    <Group title="Your businesses">
      {rows.length === 0 ? (
        <ThemedText themeColor="textTertiary" testID="money-businesses-empty">
          No businesses yet. Add one to keep its money apart from your own.
        </ThemedText>
      ) : (
        rows.map((row) => (
          <SwipeRow
            key={row.id}
            open={open?.id === row.id ? open.side : null}
            onOpenChange={(side) => setOpen(side ? { id: row.id, side } : null)}
            onEdit={() => edit(row.id)}
            onArchive={() => archive.mutate({ id: row.id, archived: !row.archivedAt })}
            archiveLabel={row.archivedAt ? 'Restore' : 'Archive'}
            archiveIcon={row.archivedAt ? restoreIcon : archiveIcon}
            enabled
            name={row.name}
            testID={`money-business-${row.id}`}>
            <Pressable
              role="button"
              aria-label={`Edit ${row.name}`}
              onPress={() => edit(row.id)}
              testID={`money-business-edit-${row.id}`}
              style={styles.row}>
              <ThemedText themeColor={row.archivedAt ? 'textTertiary' : 'text'}>
                {`${row.name}${row.archivedAt ? ' (archived)' : ''}`}
              </ThemedText>
              <ThemedText type="footnote" themeColor="textTertiary">
                {`PIB ${row.pib}`}
              </ThemedText>
            </Pressable>
          </SwipeRow>
        ))
      )}
    </Group>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, justifyContent: 'center' },
});
