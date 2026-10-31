# 06 — App size (MANDATORY)

**Scope:** cost of every dependency, import, asset, font, and size-related build setting in Hive (Expo SDK 58, Metro, Hermes, EAS Build/Update, pnpm). Goal: smallest store download and OTA update on all three platforms.

## Non-negotiables

- [ ] Every new dependency is justified (Atlas/bundlephobia checked, no installed or Expo built-in equivalent) and asked for first (AGENTS.md)
- [ ] No `moment`, no full `lodash`, no `import *` from large libraries — `Intl`/`Date` and per-function imports
- [ ] ESM only in `src/` — no `require()`/`module.exports` (breaks tree shaking)
- [ ] Bundled images are compressed, correctly sized, and used; fonts bundle only the weights rendered
- [ ] A new native module is called out in the PR as a store release (fingerprint: CI labels it, see 08 §5)
- [ ] Size-affecting PRs state the before/after Atlas bundle delta (PR template)
- [ ] `pnpm deps:check` clean and no duplicate majors of heavy packages; `pnpm doctor:expo` (CI)

## Dependency discipline

- Before adding a package: bundlephobia (JS weight, tree-shakeability) and whether it ships native code (`ios/`/`android/` dirs or a config plugin). Install/version rules: 08 §4.
- Prefer what's installed: Expo SDK modules, `@expo/ui`, RN built-ins, TanStack Query. One helper is not a reason for a dependency — write it in `src/utils/`.
- **NEVER** `moment` (all locales, not shakeable) or full `lodash` (CJS). Hermes ships `Intl`:

  ```ts
  // ❌ moment(d).format('MMM D, YYYY'); _.uniqBy(xs, 'id');
  // ✅
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  [...new Map(xs.map((x) => [x.id, x])).values()];
  ```

  If a lodash function is genuinely irreplaceable, use `lodash-es` with a named import.

- Remove a dependency when its last usage is deleted.

## Tree shaking & import rules

- Metro tree shaking is production-only and only shakes ESM; CJS files are kept whole. **NEVER** add Babel plugins that convert ESM to CJS (e.g. `@babel/plugin-transform-modules-commonjs`).
- **NEVER** `import * as X` from a large library (icon packs, utility libs) when you need a few symbols. Expo SDK modules imported as namespaces per their docs (`* as SplashScreen`, `* as Updates` in `src/`) are fine.
- Barrels: pure re-exports (`export { Foo } from './foo'`) are fine; never side-effectful barrels (run code, register globals, mix `module.exports`).
- Modules stay side-effect-free (no top-level global mutation, subscriptions, prototype patching) — side-effectful modules can't be removed or inlined and block lazy loading (05 startup).
- **NEVER** flip `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH` / `EXPO_UNSTABLE_TREE_SHAKING` or Metro `inlineRequires` as a drive-by. Enabling them is a deliberate PR with a verified production export on every platform; `inlineRequires` only together with Expo tree shaking (inlining without it can reorder side effects).
- Import `Platform` directly from `react-native` (not via a helper) so platform shaking drops other platforms' branches. `__DEV__` blocks are stripped from production.
- With `@expo/vector-icons`, import one family (`@expo/vector-icons/MaterialIcons`), never the barrel. Icons default to `expo-symbols` (03 §6).

## Asset discipline

- Compress every bundled raster before committing (lossy at ≥95% SSIM, or `optipng`/`pngcrush`); no raw design-tool exports.
- **PREFER** vector (SF/Material Symbols via `expo-symbols`, SVG) over raster; WebP/AVIF over PNG/JPEG for photos. Never bundle GIFs — use video or animated WebP.
- Ship rasters at rendered resolution (@1x/@2x/@3x, 04 §8). On iOS consider `RCTUseAssetCatalog: true` (`ios.infoPlist`, a native change) so app thinning strips unneeded scales — mind its documented `Image.prefetch`/animation limitations.
- Delete unused files in `assets/`. Verify real binary contents with APK Analyzer or by unzipping the `.ipa`.
- Fonts (none bundled today): only the weights/styles actually used; variable fonts only if they replace ≥3 static weights; subset when tooling allows.
- **PREFER** loading rarely used large assets (onboarding video, seasonal art) remotely via `expo-image` caching.

## Android binary

- Ship AABs to Play (EAS production default); judge size by Play Console download size, not the artifact.
- Keep R8 and resource shrinking on for release; a stripped-code crash gets a targeted keep rule (`expo-build-properties` `extraProguardRules`), never shrinking off.
- Since RN 0.73 native libs are stored uncompressed: the local `.apk` is larger but Play download size is unchanged and launch is faster. **NEVER** set `useLegacyPackaging: true` to "fix" it.
- Keep Hermes (default); never switch to JSC to "save size".
- Optional: since all images go through `expo-image` (Glide), RN's GIF/WebP decoders can be disabled — `["expo-build-properties", { "android": { "gifEnabled": false, "webpEnabled": false } }]`. `expo-build-properties` is not installed; adding it is a native change (08).

## iOS binary

- App thinning is automatic; judge size from App Store Connect → TestFlight → Build Metadata → **App File Sizes**, not the `.ipa`.
- A minimal Expo app is under 4 MB download — large deltas come from our deps and assets.

## expo-updates / OTA size

- Every byte of JS and every `require()`d asset rides along in each OTA update — a new bundled asset in an OTA-only change is downloaded by every user.
- `updates.assetPatternsToBeBundled` limits which assets ship in updates (OTA payload only — it does not shrink the store binary). After configuring it, run `npx expo-updates assets:verify <dir>`.

## Measuring — before merging size-affecting changes

```bash
EXPO_ATLAS=true npx expo export          # production export, all platforms
npx expo-atlas .expo/atlas.jsonl        # per-module bundle weight
```

- Use Atlas to catch "small" packages pulling megabytes of transitive deps. Live: `EXPO_ATLAS=true npx expo start --no-dev` (Shift+M); ⌘-click a module to see who imported it.
- State the before/after delta in the PR.
- `.expo/atlas.jsonl` embeds inlined `EXPO_PUBLIC_` values — never commit or share it.

## pnpm duplicate dependencies

- After dependency changes check `pnpm why <pkg>` / `pnpm list <pkg> --depth Infinity`; two majors of one heavy lib double-bundle silently.
- `pnpm dedupe` first; `pnpm.overrides` only as a last resort.
- Singletons (`react-native`, `react-native-reanimated`, `react-native-screens`, `expo`) must exist exactly once.

## Native module cost

- Each native dependency adds compiled code to both binaries for every user, forces a store release, slows builds, and can't be removed by OTA. "Nice JS API" is not a justification.
- Order of preference: Expo SDK built-in → pure-JS package → write it yourself → new native dependency.
- **NEVER** add a native module for a capability an installed one has (blurhash → `expo-image`; `expo-sqlite` + Drizzle is installed — use it before any storage lib).

## Web bundle

Not applicable — Hive ships no web UI ([ADR 0001](../decisions/0001-modules-sqlite-native-only.md)). **NEVER** enable `asyncRoutes` for native production expecting size/startup wins — unsupported there (Hermes already memory-maps bytecode). Anything imported by `src/app/_layout.tsx` is in every bundle — keep heavy code in module screens reached via routes.

## Common agent mistakes

1. Adding `moment`, `lodash`, `axios`, `uuid`, or an icon mega-pack by habit — built-in or zero-dep replacements exist.
2. `import * as Icons from '@expo/vector-icons'` or re-exporting whole libraries through a barrel.
3. Committing uncompressed multi-MB PNGs or every weight of a font family.
4. Judging size from the `.apk`/`.ipa` instead of Play Console / TestFlight download size.
5. Assuming `assetPatternsToBeBundled` shrinks the store binary.
6. Never running Atlas, so a "4 KB" package ships 900 KB of transitive deps.
7. Importing a module's heavy dependency from `_layout.tsx` or shared code so every screen pays for it.
8. Enabling `inlineRequires`, `EXPO_UNSTABLE_*` flags, `asyncRoutes` on native, or `useLegacyPackaging` as a drive-by "optimization".
