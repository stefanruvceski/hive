import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { SaveButton } from '@/components/ui/save-button';
import { useToday } from '@/hooks/use-today';

import { useSaveRate } from '../../data/queries';
import { baseCurrency, currencies, parseRate } from '../../domain/amount';
import { isIsoDate } from '../../domain/dates';
import { Chips, Field, Group } from '../components/fields';
import { MoneyScreen } from '../components/money-screen';

const foreign = currencies.filter((code) => code !== baseCurrency);

/** Add an exchange rate by hand: RSD per one unit of a currency, for a day. */
export function MoneyRate() {
  const today = useToday();
  const save = useSaveRate();
  const [currency, setCurrency] = useState<string>(foreign[0] ?? 'EUR');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = parseRate(rate);
    if (parsed === null) return setError('Enter the rate as RSD per one unit.');
    if (!isIsoDate(date)) return setError('Enter the date as YYYY-MM-DD.');
    setError(null);
    save.mutate({ currency, date, rate: parsed }, { onSuccess: () => router.back() });
  };

  return (
    <MoneyScreen
      id="money-rate"
      title="New rate"
      trailing={<SaveButton onPress={submit} disabled={save.isPending} testID="money-rate-save" />}>
      <Group title="Rate">
        <Chips
          options={foreign.map((code) => ({ value: code, label: code }))}
          value={currency}
          onChange={setCurrency}
          idPrefix="money-rate-currency"
        />
        <Field
          label="Rate, RSD per unit"
          value={rate}
          onChangeText={setRate}
          placeholder="RSD per 1 unit"
          keyboardType="decimal-pad"
          testID="money-rate-rate"
        />
        <Field
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          maxLength={10}
          testID="money-rate-date"
        />
        {error ? (
          <ThemedText themeColor="danger" role="alert" testID="money-rate-error">
            {error}
          </ThemedText>
        ) : null}
      </Group>
    </MoneyScreen>
  );
}
