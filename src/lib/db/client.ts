import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

// Opened lazily on first use, never at import time: modules reachable from _layout.tsx are
// evaluated in every bundle and test, and a native call at import breaks them (review-lessons L-001).
let instance: ReturnType<typeof drizzle> | undefined;

/** The app's single local database. All reads and writes go through Drizzle (docs/agent-rules/07). */
export function getDb() {
  instance ??= drizzle(openDatabaseSync('hive.db'));
  return instance;
}
