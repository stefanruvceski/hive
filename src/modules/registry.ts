import type { Href } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';

import type { AppTint } from '@/constants/theme';
import type { HomeSummaryResult } from '@/utils/home-summary';

import { useHabitsHomeSummary } from './habits/data/home-summary';
import { useMoneyHomeSummary } from './money/data/home-summary';

/** The groups Home starts with (docs/design/canvas/Main.dc.html). Users rename and reorder them (#31). */
export const defaultHomeGroups = [
  { id: 'money', name: 'Money' },
  { id: 'body-mind', name: 'Body & mind' },
  { id: 'creative', name: 'Creative' },
] as const;

export type DefaultHomeGroupId = (typeof defaultHomeGroups)[number]['id'];

/** A mini-app inside Hive (Health, Habits, Money…). Scaffold one with `pnpm new:module <id>`. */
export type HiveModule = {
  /** kebab-case; also the route segment (`/<id>`) and the prefix of the module's tables. */
  id: string;
  title: string;
  /** One line describing the app, shown where it is listed by name. */
  description: string;
  /** Per-platform name — a bare SF Symbol string renders nothing on Android (agent-rules/03 §6). */
  icon: Exclude<SymbolViewProps['name'], string>;
  /** The app's color on its tile (`AppTints`); never the accent teal. */
  tint: AppTint;
  /** The Home group a new install puts it in. */
  group: DefaultHomeGroupId;
  href: Href;
  /**
   * Optional: the module's widget in Home's Today section (#33). A hook, called once per render by
   * that module's widget; keep it light (its own queries + pure counting in `domain/`).
   */
  useHomeSummary?: () => HomeSummaryResult;
};

/**
 * Every module, in default order within its group. Where the user moved, pinned or hid an app is
 * stored in `home_apps`.
 */
export const hiveModules: readonly HiveModule[] = [
  {
    id: 'habits',
    title: 'Habits',
    description: 'What you want to do every day.',
    icon: { ios: 'checkmark.circle', android: 'task_alt', web: 'task_alt' },
    tint: 'habits',
    group: 'body-mind',
    href: '/habits',
    useHomeSummary: useHabitsHomeSummary,
  },
  {
    id: 'money',
    title: 'Money',
    description: 'Income, spending and budgets for you and your business.',
    icon: { ios: 'dollarsign.circle', android: 'paid', web: 'paid' },
    tint: 'money',
    group: 'money',
    href: '/money',
    useHomeSummary: useMoneyHomeSummary,
  },
];
