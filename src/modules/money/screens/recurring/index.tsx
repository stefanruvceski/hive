import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

import { useCategories } from '../../data/queries';
import { type Rule, useRecurring, useStopRule } from '../../data/recurring-queries';
import { formatMinor } from '../../domain/amount';
import { weekdayName } from '../../domain/recurring';
import { Group } from '../components/fields';
import { Gate } from '../components/gate';
import { MoneyScreen } from '../components/money-screen';

const describe = (rule: Rule) =>
  rule.frequency === 'weekly' ? `Every ${weekdayName(rule.day)}` : `Monthly on day ${rule.day}`;

/** Rules that create entries by themselves: salary, rent, subscriptions. */
export function MoneyRecurring() {
  const rules = useRecurring();
  const categories = useCategories();
  return (
    <MoneyScreen
      id="money-recurring"
      title="Recurring"
      trailing={
        <PrimaryButton
          label="Add"
          size="compact"
          onPress={() => router.push('/money/rule')}
          testID="money-recurring-add"
        />
      }>
      <Gate queries={[rules, categories]} id="money-recurring">
        {(rules.data ?? []).length === 0 ? (
          <EmptyState
            title="No recurring entries"
            description="Add your salary or rent once and it appears every time it is due."
            testID="money-recurring-empty"
          />
        ) : (
          <Group>
            {(rules.data ?? []).map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                category={(categories.data ?? []).find((c) => c.id === rule.categoryId)}
              />
            ))}
          </Group>
        )}
      </Gate>
    </MoneyScreen>
  );
}

function RuleRow({ rule, category }: { rule: Rule; category?: { emoji: string; name: string } }) {
  const today = useToday();
  const stop = useStopRule();
  const active = !rule.endDate || rule.endDate >= today;
  return (
    <View style={styles.row} testID={`money-rule-${rule.id}`}>
      <Pressable
        role="button"
        aria-label={`Edit rule ${category?.name ?? ''}`}
        onPress={() => router.push({ pathname: '/money/rule', params: { id: rule.id } })}
        testID={`money-rule-edit-${rule.id}`}
        style={styles.text}>
        <ThemedText>{`${category ? `${category.emoji} ${category.name}` : 'Rule'} · ${formatMinor(rule.amountMinor, rule.currency)}`}</ThemedText>
        <ThemedText type="footnote" themeColor="textTertiary">
          {`${describe(rule)} · ${rule.space === 'business' ? 'Firma' : 'Private'}${active ? '' : ' · stopped'}`}
        </ThemedText>
      </Pressable>
      <Pressable
        role="button"
        aria-label={active ? 'Stop rule' : 'Resume rule'}
        onPress={() => stop.mutate({ id: rule.id, endDate: active ? today : null })}
        testID={`money-rule-stop-${rule.id}`}
        style={styles.stop}>
        <ThemedText themeColor={active ? 'danger' : 'accent'}>
          {active ? 'Stop' : 'Resume'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: Spacing.two },
  text: { flex: 1, minHeight: 48, justifyContent: 'center' },
  stop: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.two },
});
