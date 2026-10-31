# 08 — Native Configuration & Dependencies

**Scope:** Everything that touches native code in Hive (iOS + Android only; no web UI) — CNG/prebuild, [app.config.ts](../../app.config.ts), config plugins, adding dependencies, [eas.json](../../eas.json), expo-updates mechanics, permissions, and EAS env vars.

## Non-negotiables

- [ ] NEVER create, edit, or commit `ios/` or `android/` — generated (CNG) and git-ignored. Regenerate with `pnpm prebuild` (`expo prebuild --clean`).
- [ ] All native configuration goes through `app.config.ts` and config plugins.
- [ ] `npx expo install <pkg>` for every `expo-*` / `react-native-*` / native package; `pnpm add` only for pure-JS packages. Never npm/yarn.
- [ ] After ANY dependency change: `pnpm doctor:expo` (CI) and `pnpm deps:check` are clean.
- [ ] A native change (fingerprint moves) ⇒ store release, not OTA — say "requires store release" in the PR (CI labels it `fingerprint:changed`).
- [ ] Minimum permissions, each with a specific user-facing purpose string.
- [ ] No secrets in `eas.json`, `EXPO_PUBLIC_*`, or committed `.env` files ([13 §1](13-security.md)).

Adding a dependency or touching `app.config.ts` / `eas.json` / `.eas/` is "ask first" (AGENTS.md) and CODEOWNERS-reviewed.

---

## 1. CNG discipline

- NEVER hand-edit generated files (`Info.plist`, `AndroidManifest.xml`, `Podfile`, gradle). `prebuild --clean` destroys them, and `--clean` is the only sanctioned mode.
- To change native behavior, in this order: (1) built-in app config key → (2) the library's or a community config plugin → (3) a local config plugin (§3).
- A committed `ios/` or `android/` directory is a bug — flag it; don't edit inside it.

## 2. app.config.ts structure

Dynamic TS config exporting `({ config }: ConfigContext) => ExpoConfig`. Preserve its structure:

- **Variants:** `APP_VARIANT` (set per EAS profile, §8) selects `name` / `bundleId` / `scheme` from the `config` record so dev, preview and production install side by side. Any per-environment value goes through this record, not scattered conditionals.
- **Platform keys:** `ios.bundleIdentifier`, `ios.infoPlist`, `android.package`, `android.adaptiveIcon`, …; permission strings per §7.
- **plugins:** currently `expo-router`, `expo-sqlite`, `expo-splash-screen`. Append; don't reorder (plugins run in order).
- **Do not change** without a maintainer decision: `runtimeVersion: { policy: 'fingerprint' }` (the OTA contract, [10](10-ci-release.md)), `web.output: 'server'` (kept only so API routes work — there is no web app), `experiments.typedRoutes` and `experiments.reactCompiler` (on).
- `EAS_PROJECT_ID` / `EAS_OWNER` are filled by the maintainer via `eas init` — never invent them.
- Trap: dynamic configs are not supported by automatic server deployment (`EXPO_UNSTABLE_DEPLOY_SERVER`); deploy the server manually and set `origin` on the `expo-router` plugin when needed.

```ts
// ✅ CORRECT — native capability via config
plugins: [
  'expo-router',
  ['expo-camera', { cameraPermission: 'Hive uses the camera to scan hive QR labels.' }],
],
// ❌ WRONG — adding NSCameraUsageDescription to a generated ios/Hive/Info.plist
```

## 3. Config plugins

- Preference: the library's own plugin → [expo/config-plugins](https://github.com/expo/config-plugins) → local plugin (`plugins/with-thing.ts`, exporting `withThing`) only for config nothing else covers. Local plugins use mod helpers (`withInfoPlist`, `withAndroidManifest`), never regex mods, and stay idempotent.
- Adding, removing, or re-configuring a plugin is a native change (§5). Verify with `npx expo config --type prebuild`.

## 4. Adding dependencies

```bash
npx expo install expo-camera   # ✅ native — resolves the SDK-58-compatible version
pnpm add zod                   # ✅ pure JS
pnpm add react-native-camera   # ❌ native via pnpm add — can pick an incompatible version
npm install expo-camera        # ❌ never npm/yarn
```

- Before adding a third-party native lib, check [React Native Directory](https://reactnative.directory) for maintenance and config-plugin/CNG support. A lib that needs manual native edits and has no plugin needs a local plugin (§3).
- Fix `pnpm deps:check` mismatches with `npx expo install <pkg>`, never by hand-pinning.
- Version pins in `package.json` (e.g. `eslint` 9.x for `eslint-config-expo`) are intentional — don't "upgrade while you're there".
- Expo SDK upgrades come as one Renovate group (dashboard approval), finished with `npx expo install --fix` + `pnpm doctor:expo`; Renovate disables solo bumps of SDK-pinned native libs — don't do them by hand either.
- pnpm refuses versions younger than 3 days and blocks dependency build scripts ([pnpm-workspace.yaml](../../pnpm-workspace.yaml)); don't loosen either to make an install pass ([13 §10](13-security.md)). The only `minimumReleaseAgeExclude` entries are `expo`, `expo-*`, `@expo/*` (SDK-pinned by `npx expo install`) and `@types/node` (types only, already locked) — don't add more without a maintainer decision.
- **Installed native data dep:** `expo-sqlite` (with the pure-JS `drizzle-orm`, dev `drizzle-kit` and `babel-plugin-inline-import`). [babel.config.js](../../babel.config.js) inlines `.sql` files and [metro.config.js](../../metro.config.js) adds the `sql` source extension so Drizzle migrations bundle ([07 §8](07-data-state.md)). Both files are build config — changing them is "ask first".

## 5. Native-change detection ⇒ build, not OTA

Native (fingerprint-changing) = native dependency added/upgraded/removed, `plugins` or plugin options, prebuild-relevant `app.config.ts` keys (icons, splash, permissions, bundle ids, `infoPlist`, orientation, …), build-affecting `eas.json` changes, SDK/RN bumps. Full list and the deploy pipeline: [10](10-ci-release.md).

- The question "is this native?" is answered by the PR label from [fingerprint.yml](../../.github/workflows/fingerprint.yml): `fingerprint:changed` ⇒ merge triggers a store build + approval-gated submit; `fingerprint:compatible` ⇒ OTA. Still state the release impact in the PR description.

## 6. expo-updates / OTA rules

- OTA = JS bundle + bundled assets only; never native modules, plugin output, or manifest/Info.plist entries.
- An update installs only on builds with the same platform and runtime version (fingerprint); the channel comes from the `eas.json` profile and maps to the same-named branch.
- Production updates only via the merge-to-`main` workflow; PR previews via `preview.yml`. Never `eas update --channel production` by hand ([10](10-ci-release.md), [13 §9](13-security.md)).
- `eas update` inlines the env present at publish time — pass `--environment` (§9).

## 7. Permissions hygiene

- Request the minimum set; adding one is a native change (§5) and draws store-review scrutiny.
- iOS purpose strings go through the owning library's plugin option, else `ios.infoPlist`:

```ts
// ✅ specific rationale via the plugin
['expo-location', { locationWhenInUsePermission: 'Hive shows apiaries near your current location.' }],
// ❌ generic string or "just in case" permission
locationWhenInUsePermission: 'This app needs your location.',
```

- Android: `android.permissions` to add, `android.blockedPermissions` to strip ones a library adds but Hive doesn't use.
- Request at runtime in context (when the user taps the feature), not at launch; handle denial, never loop the prompt.
- Removing a feature removes its permissions and purpose strings in the same PR.

## 8. eas.json profiles

Profile table: [10](10-ci-release.md).

- Each profile sets `APP_VARIANT` matching its name, and `channel` matching the EAS Update branch — keep the profile ↔ variant ↔ channel mapping intact when editing either file.
- `appVersionSource: "remote"` + `autoIncrement`: EAS owns build numbers — never hand-edit them.
- `env` blocks hold only `EXPO_PUBLIC_*` and harmless flags like `APP_VARIANT` (the file is committed); secrets go to EAS env vars (§9).

## 9. Environment variables in EAS

Client env rules (`EXPO_PUBLIC_*`, static dot access, `.env` file resolution) live in [01 §5](01-architecture.md); adding a variable is a checklist in [src/lib/AGENTS.md](../../src/lib/AGENTS.md). EAS mechanics:

- Define variables on EAS (`eas env:set --name … --environment production --visibility …`), bind an environment to a build profile with its `environment` field, pass `--environment` to `eas update`, pull locally with `eas env:pull`.
- Visibility: `plaintext` for anything client-side (public once shipped), `sensitive` (obfuscated in logs), `secret` (unreadable outside EAS — build-time credentials like npm tokens). `secret` does NOT make a value safe to embed in the app.
- Server-only secrets for API routes use non-`EXPO_PUBLIC_` names and come from the server host — never committed `.env` files, never `src/lib/env.ts` ([13 §1](13-security.md)).

## 10. Development builds vs Expo Go

- Hive uses development builds (`expo-dev-client`); don't recommend Expo Go or judge a library by its "Expo Go" tag.
- After a native change, rebuild the dev client locally (`pnpm build:dev:ios` / `pnpm build:dev:android`, or `pnpm ios` / `pnpm android`) — "`Cannot find native module …`" means a new dev build, not a cache clear. No casual cloud builds ([10](10-ci-release.md)).

---

## Common agent mistakes

1. Editing or committing `ios/` / `android/` files instead of using config or a plugin.
2. Installing a native package with `pnpm add` / `npm install` instead of `npx expo install`.
3. Shipping a native change without "requires store release" in the PR, or assuming OTA can deliver a new native module.
4. Writing a local config plugin when the library ships one.
5. Permissions without purpose strings, with generic strings, or added "just in case".
6. Secrets in `eas.json` `env`, `EXPO_PUBLIC_*`, or committed `.env` files.
7. Hand-bumping one SDK-pinned native lib instead of the grouped SDK upgrade.
8. Testing a newly added native lib in the old dev build and concluding it's broken.
9. Changing `runtimeVersion`, channels, `APP_VARIANT` mapping, or `web.output` without a maintainer decision.
