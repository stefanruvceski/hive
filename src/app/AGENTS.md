# src/app — routes only

Every file here is an Expo Router route. Read [docs/agent-rules/02-navigation.md](../../docs/agent-rules/02-navigation.md) before adding or changing one.

- **Thin routes.** A route reads params, sets `<Stack.Screen options>`, and renders a screen — from `@/modules/<id>/screens/<name>` (module) or `@/screens/<name>` (shell). No data fetching, business logic or more than ~20 lines of JSX. Copy `settings.tsx`.
- **Layout.** `index.tsx` is Home (the launcher, `headerShown: false`), `settings.tsx` is Settings, and each module owns a folder: `<id>/index.tsx` (its entry, opened from the Home card) plus `<id>/<screen>.tsx`. Generate them with `pnpm new:module` / `pnpm new:screen <id>/<screen>`. No tabs — the root is a plain `<Stack />`.
- **Deep links land on Home.** The root layout's `unstable_settings.anchor = 'index'` keeps Home under every deep link, so Back, Android's back button and swipe-back work after a cold start. A module that adds its own `<id>/_layout.tsx` (nested stack) sets `unstable_settings.anchor` there too.
- **Default export required** here (Expo Router resolves routes by it); everywhere else in `src/` exports are named. Lint enforces both.
- **Typed routes.** Absolute hrefs only; dynamic routes use `{ pathname: '/users/[id]', params: { id } }`. Params are strings — pass ids, never objects.
- **Deep links are untrusted input.** Validate every `useLocalSearchParams()` value before using it; never navigate to, open or fetch a URL taken from a param ([13 §4](../../docs/agent-rules/13-security.md)).
- **No web routes.** iOS + Android only — never add `.web.tsx`; a platform route (`foo.ios.tsx`) needs a universal `foo.tsx`, and splitting in `src/components/` is preferred.
- **`_layout.tsx` is the app bootstrap.** Global providers go here and nowhere else. It runs the database migrations (`useMigrations(getDb(), migrations)`) and keeps the splash up until they finish. Anything it imports (and everything that imports) is evaluated in every bundle — check new imports for module-level side effects and required env vars ([review-lessons L-001](../../docs/agent-rules/review-lessons.md)).

## api/ — server routes (`*+api.ts`)

- Run on the server only; export `GET`/`POST`/… handlers. Never import them (or anything holding a secret) from client code. Kept for future remote integrations; `app.config.ts` keeps `web.output: 'server'` only for them.
- The only place in `src/` allowed to read non-`EXPO_PUBLIC_` env vars and call `fetch` directly.
- Validate every input (body, query, params) and return 400 on bad input; authorize per resource, not just "logged in" ([13 §7–8](../../docs/agent-rules/13-security.md)).
- Errors use one shape — `{ error: { code, message } }` with a correct status — and never leak stack traces or env values ([14 §7](../../docs/agent-rules/14-errors-resilience.md)).
