// Drizzle Kit: one SQLite database (`hive.db`), schemas from the core and every module.
// `pnpm db:generate` turns schema changes into a new migration in src/lib/db/migrations/.
import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  driver: 'expo',
  schema: ['./src/lib/db/schema.ts', './src/modules/*/data/schema.ts'],
  out: './src/lib/db/migrations',
} satisfies Config;
