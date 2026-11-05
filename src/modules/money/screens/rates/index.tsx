import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { Spacing } from '@/constants/theme';

import { useRates } from '../../data/queries';
import { latestRates } from '../../domain/rates';
import { Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';

/**
 * Exchange rates, typed by hand: RSD per one unit. The rate on the entry's day is what an entry
 * stores, so changing a rate later never moves old totals.
 */
export function MoneyRates() {
  const rates = useRates();
  return (
    <MoneyScreen
      id="money-rates"
      title="Exchange rates"
      trailing={
        <GlassButton
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          label="Add rate"
          onPress={() => router.push('/money/rate')}
          testID="money-rates-add"
        />
      }>
      <Gate queries={[rates]} id="money-rates">
        <RateList rows={rates.data ?? []} />
      </Gate>
    </MoneyScreen>
  );
}

function RateList({
  rows,
}: {
  rows: { currency: string; date: string; rate: number; source: 'nbs' | 'manual' }[];
}) {
  const latest = latestRates(rows);

  return (
    <>
      <Group title="Latest">
        {latest.length === 0 ? (
          <ThemedText themeColor="textTertiary" testID="money-rates-empty">
            No rates yet. Add one with +, or type it when you add an entry in a foreign currency.
          </ThemedText>
        ) : (
          latest.map((row) => (
            <View key={row.currency} style={styles.row} testID={`money-rate-${row.currency}`}>
              <ThemedText>{row.currency}</ThemedText>
              <ThemedText themeColor="textTertiary">{`${row.rate} RSD · ${row.date}`}</ThemedText>
            </View>
          ))
        )}
      </Group>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    alignItems: 'center',
    gap: Spacing.three,
  },
});
