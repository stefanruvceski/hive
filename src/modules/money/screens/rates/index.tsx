import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

import { useRates, useSaveRate } from '../../data/queries';
import { baseCurrency, currencies, parseRate } from '../../domain/amount';
import { isIsoDate } from '../../domain/dates';
import { latestRates } from '../../domain/rates';
import { Chips, Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';

const foreign = currencies.filter((code) => code !== baseCurrency);

/**
 * Exchange rates, typed by hand: RSD per one unit. The rate on the entry's day is what an entry
 * stores, so changing a rate later never moves old totals.
 */
export function MoneyRates() {
  const rates = useRates();
  return (
    <MoneyScreen id="money-rates" title="Exchange rates">
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
  const today = useToday();
  const save = useSaveRate();
  const [currency, setCurrency] = useState<string>(foreign[0] ?? 'EUR');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const latest = latestRates(rows);

  const submit = () => {
    const parsed = parseRate(rate);
    if (parsed === null) return setError('Enter the rate as RSD per one unit.');
    if (!isIsoDate(date)) return setError('Enter the date as YYYY-MM-DD.');
    setError(null);
    save.mutate({ currency, date, rate: parsed }, { onSuccess: () => setRate('') });
  };

  return (
    <>
      <Group title="Latest">
        {latest.length === 0 ? (
          <ThemedText themeColor="textTertiary" testID="money-rates-empty">
            No rates yet. Add one below, or type it when you add an entry in a foreign currency.
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
      <Group title="Add a rate">
        <Chips
          options={foreign.map((code) => ({ value: code, label: code }))}
          value={currency}
          onChange={setCurrency}
          idPrefix="money-rates-currency"
        />
        <Field
          label="Rate, RSD per unit"
          value={rate}
          onChangeText={setRate}
          placeholder="RSD per 1 unit"
          keyboardType="decimal-pad"
          testID="money-rates-rate"
        />
        <Field
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          maxLength={10}
          testID="money-rates-date"
        />
        {error ? (
          <ThemedText themeColor="danger" role="alert" testID="money-rates-error">
            {error}
          </ThemedText>
        ) : null}
        <PrimaryButton label="Save rate" onPress={submit} testID="money-rates-save" />
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
