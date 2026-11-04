import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';

import { useBudgets, useSetBudget } from '../../data/budget-queries';
import { useCategories, useEntries, useItems } from '../../data/queries';
import { formatMinor, minorToText, parseAmount } from '../../domain/amount';
import { budgetStatus, effectiveLimit } from '../../domain/budgets';
import { monthLabel, monthOf } from '../../domain/dates';
import { spendingByCategory } from '../../domain/entries';
import { categoryLabel, inView } from '../../domain/owners';
import { Field, Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';
import { useMoneyView } from '../components/use-money-view';
import { ViewChips } from '../components/view-chips';

/** Monthly limits per expense category of the open view, with this month's spending against them. */
export function MoneyBudgets() {
  const today = useToday();
  const entries = useEntries();
  const items = useItems();
  const categories = useCategories();
  const budgets = useBudgets();
  const scope = useMoneyView();
  const month = monthOf(today);
  const monthEntries = (entries.data ?? []).filter(
    (entry) => inView(entry, scope.view) && monthOf(entry.date) === month,
  );
  const spent = spendingByCategory(monthEntries, items.data ?? []);

  return (
    <MoneyScreen id="money-budgets" title="Budgets">
      <Gate queries={[entries, items, categories, budgets, ...scope.queries]} id="money-budgets">
        <ViewChips view={scope.view} businesses={scope.live} onChange={scope.setView} />
        <ThemedText type="footnote" themeColor="textTertiary">
          {`Limits for ${monthLabel(month)} on. Past months keep the limit they had.`}
        </ThemedText>
        <Group>
          {(categories.data ?? [])
            .filter(
              (c) =>
                scope.categorySpaces.includes(c.space) && c.kind === 'expense' && !c.archivedAt,
            )
            .map((c) => (
              <BudgetRow
                key={c.id}
                id={c.id}
                label={categoryLabel(c, scope.view === 'all')}
                month={month}
                limit={effectiveLimit(budgets.data ?? [], c.id, month)}
                spent={spent.get(c.id) ?? 0}
              />
            ))}
        </Group>
      </Gate>
    </MoneyScreen>
  );
}

function BudgetRow({
  id,
  label,
  month,
  limit,
  spent,
}: {
  id: string;
  label: string;
  month: string;
  limit: number | null;
  spent: number;
}) {
  const theme = useTheme();
  const setBudget = useSetBudget();
  // null = show the saved limit; text while typing.
  const [text, setText] = useState<string | null>(null);
  const status = limit ? budgetStatus(spent, limit) : null;

  return (
    <View style={styles.row} testID={`money-budget-${id}`}>
      <View style={styles.top}>
        <ThemedText>{label}</ThemedText>
        <ThemedText
          type="footnote"
          themeColor={status?.state === 'over' ? 'danger' : 'textTertiary'}
          testID={`money-budget-status-${id}`}>
          {limit ? `${formatMinor(spent)} of ${formatMinor(limit)}` : `${formatMinor(spent)} spent`}
        </ThemedText>
      </View>
      {status ? (
        <View
          role="progressbar"
          aria-label={`${label} budget`}
          aria-valuenow={Math.round(Math.min(status.ratio, 1) * 100)}
          style={[styles.track, { backgroundColor: theme.controlBorder }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(status.ratio, 1) * 100}%`,
                backgroundColor: status.state === 'ok' ? theme.accent : theme.danger,
              },
            ]}
          />
        </View>
      ) : null}
      <Field
        label={`${label} monthly limit in RSD`}
        value={text ?? (limit ? minorToText(limit) : '')}
        onChangeText={setText}
        placeholder="No limit"
        keyboardType="decimal-pad"
        testID={`money-budget-input-${id}`}
        onEndEditing={() => {
          if (text === null) return;
          const parsed = text.trim() === '' ? 0 : parseAmount(text);
          if (parsed !== null)
            setBudget.mutate({ categoryId: id, fromMonth: month, limitMinor: parsed });
          setText(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one, paddingVertical: Spacing.two },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
