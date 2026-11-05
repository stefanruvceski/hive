import { router } from 'expo-router';

import { Group, LinkRow } from '../components/fields';
import { MoneyScreen } from '../components/money-screen';

/** Everything Money keeps behind the entries: budgets, recurring rules, businesses and more. */
export function MoneySettings() {
  return (
    <MoneyScreen id="money-settings" title="Money settings">
      <Group title="Manage">
        <LinkRow
          title="Budgets"
          onPress={() => router.push('/money/budgets')}
          testID="money-budgets-open"
        />
        <LinkRow
          title="Recurring"
          onPress={() => router.push('/money/recurring')}
          testID="money-recurring-open"
        />
        <LinkRow
          title="Businesses"
          onPress={() => router.push('/money/businesses')}
          testID="money-businesses-open"
        />
        <LinkRow
          title="Categories"
          onPress={() => router.push('/money/categories')}
          testID="money-categories-open"
        />
        <LinkRow
          title="Exchange rates"
          onPress={() => router.push('/money/rates')}
          testID="money-rates-open"
        />
      </Group>
    </MoneyScreen>
  );
}
