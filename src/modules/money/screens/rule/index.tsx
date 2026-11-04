import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useToday } from '@/hooks/use-today';

import { type Category, useCategories } from '../../data/queries';
import { type Rule, useRecurring, useSaveRule } from '../../data/recurring-queries';
import type { CategoryKind, Frequency } from '../../data/schema';
import { baseCurrency, currencies, minorToText, parseAmount } from '../../domain/amount';
import { isIsoDate } from '../../domain/dates';
import { type Business, ownerForView, ownerOf, spaceOfOwner } from '../../domain/owners';
import { weekdayName } from '../../domain/recurring';
import { Chips, Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';
import { useMoneyView } from '../components/use-money-view';

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;
const frequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
] as const;

/** Add or edit a recurring rule. Editing changes what comes next; entries already made stay. */
export function MoneyRule({ id }: { id?: string }) {
  const rules = useRecurring();
  const categories = useCategories();
  const scope = useMoneyView();
  const rule = id ? rules.data?.find((row) => row.id === id) : undefined;
  return (
    <MoneyScreen id="money-rule" title={id ? 'Edit rule' : 'New rule'}>
      <Gate queries={[rules, categories, ...scope.queries]} id="money-rule">
        <RuleForm
          rule={rule}
          categories={categories.data ?? []}
          businesses={scope.live}
          startOwner={rule ? ownerOf(rule) : ownerForView(scope.view)}
        />
      </Gate>
    </MoneyScreen>
  );
}

function RuleForm({
  rule,
  categories,
  businesses,
  startOwner,
}: {
  rule?: Rule;
  categories: Category[];
  businesses: Business[];
  startOwner: string;
}) {
  const today = useToday();
  const save = useSaveRule();
  const [kind, setKind] = useState<CategoryKind>(rule?.kind ?? 'expense');
  const [amount, setAmount] = useState(rule ? minorToText(rule.amountMinor) : '');
  const [currency, setCurrency] = useState(rule?.currency ?? baseCurrency);
  const [categoryId, setCategoryId] = useState<string | null>(rule?.categoryId ?? null);
  const [note, setNote] = useState(rule?.note ?? '');
  const [frequency, setFrequency] = useState<Frequency>(rule?.frequency ?? 'monthly');
  const [day, setDay] = useState(String(rule?.day ?? Number(today.slice(8))));
  const [start, setStart] = useState(rule?.startDate ?? today);
  const [owner, setOwner] = useState(startOwner);
  const space = spaceOfOwner(owner);
  const [error, setError] = useState<string | null>(null);

  const choices = categories.filter((c) => c.space === space && c.kind === kind && !c.archivedAt);
  const chosen = choices.some((c) => c.id === categoryId) ? categoryId : null;

  const submit = () => {
    const minor = parseAmount(amount);
    const dayNumber = Number(day);
    const max = frequency === 'weekly' ? 7 : 31;
    if (minor === null) return setError('Enter an amount greater than zero.');
    if (!chosen) return setError('Choose a category.');
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > max)
      return setError(
        frequency === 'weekly'
          ? 'Weekday must be 1 (Monday) to 7 (Sunday).'
          : 'Day must be 1 to 31.',
      );
    if (!isIsoDate(start)) return setError('Enter the start date as YYYY-MM-DD.');
    setError(null);
    save.mutate(
      {
        id: rule?.id,
        space,
        businessId: owner === 'private' ? null : owner,
        kind,
        amountMinor: minor,
        currency,
        categoryId: chosen,
        note,
        frequency,
        day: dayNumber,
        startDate: start,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <>
      <SegmentedControl
        options={kindOptions}
        value={kind}
        onChange={setKind}
        label="Rule type"
        testID="money-rule-kind"
      />
      {businesses.length > 0 ? (
        <Group title="Owner">
          <Chips
            options={[
              { value: 'private', label: 'Private' },
              ...businesses.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={owner}
            onChange={setOwner}
            idPrefix="money-rule-owner"
          />
        </Group>
      ) : null}
      <Group title="Amount">
        <Field
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          testID="money-rule-amount"
        />
        <Chips
          options={currencies.map((c) => ({ value: c, label: c }))}
          value={currency}
          onChange={setCurrency}
          idPrefix="money-rule-currency"
        />
      </Group>
      <Group title="Category">
        <Chips
          options={choices.map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` }))}
          value={chosen}
          onChange={setCategoryId}
          idPrefix="money-rule-category"
        />
      </Group>
      <Group title="Repeats">
        <SegmentedControl
          options={frequencyOptions}
          value={frequency}
          onChange={setFrequency}
          label="Frequency"
          testID="money-rule-frequency"
        />
        <Field
          label={frequency === 'weekly' ? 'Weekday, 1 to 7' : 'Day of month, 1 to 31'}
          value={day}
          onChangeText={setDay}
          keyboardType="number-pad"
          maxLength={2}
          testID="money-rule-day"
        />
        {frequency === 'weekly' && Number(day) >= 1 && Number(day) <= 7 ? (
          <ThemedText
            type="footnote"
            themeColor="textTertiary">{`Every ${weekdayName(Number(day))}`}</ThemedText>
        ) : null}
        <Field
          label="Starts"
          value={start}
          onChangeText={setStart}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          maxLength={10}
          testID="money-rule-start"
        />
      </Group>
      <Group title="Note">
        <Field
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Optional"
          testID="money-rule-note"
        />
      </Group>
      {error ? (
        <ThemedText themeColor="danger" role="alert" testID="money-rule-error">
          {error}
        </ThemedText>
      ) : null}
      <PrimaryButton label="Save" onPress={submit} testID="money-rule-save" />
    </>
  );
}
