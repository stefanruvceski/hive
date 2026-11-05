// Every table that goes into the all-apps backup, parents before children (the restore clears them
// in reverse). Like registry.ts this is the shell's list, not a module: it is the one place that
// knows each module's tables. A new module adds its schema here (and a table test keeps this honest).
import { coreBusinesses } from '@/lib/db/schema';

import {
  habitsCompletions,
  habitsHabits,
  habitsMood,
  habitsReminders,
  habitsTodos,
} from './habits/data/schema';
import {
  moneyBudgets,
  moneyCategories,
  moneyEntries,
  moneyItems,
  moneyPrefs,
  moneyRates,
  moneyRecurring,
} from './money/data/schema';
import {
  walletCards,
  walletNotSame,
  walletProductAliases,
  walletReceiptItems,
  walletReceipts,
  walletShopAliases,
} from './wallet/data/schema';

export const backupTables = [
  coreBusinesses,
  habitsHabits,
  habitsCompletions,
  habitsMood,
  habitsTodos,
  habitsReminders,
  moneyPrefs,
  moneyCategories,
  moneyRecurring,
  moneyEntries,
  moneyItems,
  moneyRates,
  moneyBudgets,
  walletCards,
  walletReceipts,
  walletReceiptItems,
  walletProductAliases,
  walletShopAliases,
  walletNotSame,
] as const;
