import type { Href } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';

/** A mini-app inside Hive (Health, Habits, Money…). Scaffold one with `pnpm new:module <id>`. */
export type HiveModule = {
  /** kebab-case; also the route segment (`/<id>`) and the prefix of the module's tables. */
  id: string;
  title: string;
  /** One line shown on the Home card. */
  description: string;
  icon: SymbolViewProps['name'];
  href: Href;
};

/** Default Home order. The user's own order and hidden modules are stored in `home_modules`. */
export const hiveModules: readonly HiveModule[] = [];
