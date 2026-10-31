// Committed counterpart of the generated (git-ignored) expo-env.d.ts, so `tsc --noEmit`
// works on a fresh clone and in CI before `expo start` has ever run.
/// <reference types="expo/types" />
/// <reference types="jest" />

// Drizzle migrations import .sql files as strings (babel-plugin-inline-import, metro.config.js).
declare module '*.sql' {
  const sql: string;
  export default sql;
}
