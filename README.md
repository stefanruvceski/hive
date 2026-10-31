# Hive

A personal "home" for small apps (modules — Health, Habits, Money…) on iOS and Android, with all
data kept on the phone. Rewrite of [hive-poc](https://github.com/stefanruvceski/hive-poc).
Expo SDK 58 · React Native · Expo Router · SQLite (Drizzle) · TanStack Query · EAS.
Architecture decisions: [docs/decisions/](docs/decisions/0001-modules-sqlite-native-only.md).

Conventions for contributors and AI agents: **[AGENTS.md](./AGENTS.md)**.

## Stack

| Concern         | Choice                                                       |
| --------------- | ------------------------------------------------------------ |
| Framework       | Expo SDK 58 (New Architecture, Hermes, React Compiler)       |
| Routing         | Expo Router (file-based, typed routes, Stack; Home launcher) |
| Native UI       | `@expo/ui` (SwiftUI / Jetpack Compose), Reanimated 4         |
| Data            | expo-sqlite + Drizzle ORM (local-first), TanStack Query      |
| Styling         | `StyleSheet` + design tokens (`src/constants/theme.ts`)      |
| Tests           | Jest + React Native Testing Library, Maestro (E2E)           |
| Lint / format   | `eslint-config-expo`, Prettier, husky + lint-staged          |
| Build / release | EAS Build, EAS Update (OTA), EAS Workflows, GitHub Actions   |
| Package manager | pnpm (`node-linker=hoisted`)                                 |

## macOS setup

### 1. Toolchain

```sh
# Homebrew: https://brew.sh
brew install node@22 watchman cocoapods maestro
brew install --cask zulu@17                  # JDK 17 for Gradle
brew install --cask android-commandlinetools
npm install -g pnpm eas-cli agent-device
```

### 2. iOS — Xcode (required)

Xcode is the only source of the iOS SDK, Simulator runtimes, the Swift/ObjC compilers and
code signing. There is no alternative on macOS.

1. Install **Xcode** from the App Store, open it once and accept the license.
2. `sudo xcode-select -s /Applications/Xcode.app`
3. `xcodebuild -downloadPlatform iOS` (installs a Simulator runtime).
4. Verify: `xcrun simctl list devices available`.

### 3. Android — SDK only (Android Studio is **not** required)

Android Studio is just a GUI around the SDK. Everything the CLI tools need is installable
headlessly:

```sh
# add to ~/.zshrc
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin"
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
```

```sh
source ~/.zshrc
mkdir -p "$ANDROID_HOME/cmdline-tools"
ln -sfn "$(brew --prefix)/share/android-commandlinetools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"

sdkmanager --licenses
sdkmanager "platform-tools" "emulator" \
  "platforms;android-36" "build-tools;36.0.0" \
  "system-images;android-36;google_apis;arm64-v8a"

avdmanager create avd -n Pixel_8 -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_8
emulator -avd Pixel_8 &
```

> If `sdkmanager` complains about the layout, run `sdkmanager --sdk_root="$ANDROID_HOME" ...`.
> Expo's reference: https://docs.expo.dev/workflow/android-studio-emulator/ — the Studio UI steps
> map 1:1 to the `sdkmanager` packages above.

### 4. Project

```sh
git clone <repo> hive && cd hive
pnpm install
cp .env.example .env
pnpm doctor:expo           # expo-doctor: toolchain + dependency sanity check
agent-device doctor        # optional: lets AI agents drive the simulators
```

### 5. Run

```sh
pnpm ios        # builds a dev client and opens the iOS Simulator
pnpm android    # same for the running Android emulator
pnpm start      # dev server only — connect from an installed dev build
```

The first `pnpm ios` / `pnpm android` generates `ios/` and `android/` (Continuous Native
Generation). They are git-ignored; never edit them by hand.

Physical devices: Android → enable USB debugging, `adb devices`, `pnpm android`. iPhone → plug in,
trust the Mac, `pnpm ios --device` (free Apple ID works for 7-day dev signing; a paid Apple
Developer account is needed for TestFlight/App Store).

## Quality gates

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e      # Maestro, against a dev build installed on the simulator
pnpm deps:check    # expo install --check
```

All of these run in CI on every PR (`.github/workflows/ci.yml`). The pre-commit hook runs
lint-staged and typecheck.

## Environments

| Variant       | App name       | Bundle / package            | Use                              |
| ------------- | -------------- | --------------------------- | -------------------------------- |
| `development` | Hive (Dev)     | `com.ruvceski.hive.dev`     | Dev client, PR previews          |
| `preview`     | Hive (Preview) | `com.ruvceski.hive.preview` | Internal testers, release checks |
| `production`  | Hive           | `com.ruvceski.hive`         | Stores                           |

All three install side by side. The variant is chosen by `APP_VARIANT`, set per profile in
`eas.json` and read by `app.config.ts`.

## Release flow

1. **PR** → CI + an EAS Update preview with a QR code is commented on the PR
   (`.github/workflows/preview.yml`). Open it in the Dev build.
2. **Merge to `main`** → `.eas/workflows/deploy-to-production.yml`:
   - computes the native **fingerprint**;
   - if a production build with that fingerprint exists → publishes an **OTA update** (minutes,
     no store review);
   - otherwise → **builds** iOS + Android and **submits** to TestFlight / Play internal track.
3. Promote in App Store Connect / Play Console.

Native changes (new native module, config plugin, `app.config.ts`, `eas.json`) always produce a
store build. JS-only changes ship as updates.

## One-time EAS setup

```sh
eas login
eas init                         # creates the project; paste the id + owner into app.config.ts
eas update:configure
eas credentials:configure-build -p ios -e production      # Apple Developer account
eas credentials:configure-build -p android -e production  # keystore (EAS-managed)
# Play submit: service account JSON → google-service-account.json (git-ignored)
```

Then:

- GitHub repo → Settings → Secrets → `EXPO_TOKEN` (from https://expo.dev/settings/access-tokens).
- expo.dev → project → GitHub → connect the repository (enables EAS Workflows triggers).

## Cost (keeping it ~free)

| Item                                             | Free tier                                 | Our usage                                |
| ------------------------------------------------ | ----------------------------------------- | ---------------------------------------- |
| GitHub Actions (Linux)                           | 2 000 min/mo private, unlimited public    | CI + PR previews                         |
| EAS Build (cloud)                                | 15 iOS + 15 Android builds/mo, 45-min cap | Only store releases with native changes  |
| EAS Workflows (non-build jobs)                   | 60 min/mo                                 | fingerprint/get-build/update/submit only |
| EAS Update                                       | 1 000 MAU                                 | All JS-only releases                     |
| Local builds (`eas build --local`, `expo run:*`) | Free, unlimited                           | All dev/preview builds                   |
| Maestro cloud jobs on EAS                        | Not on Free                               | Run Maestro locally                      |
| Apple Developer Program                          | $99/yr (unavoidable for App Store)        |                                          |
| Google Play Console                              | $25 once                                  |                                          |

Rules that keep the bill at $0: build locally for everything that isn't a store release, never use
`macos-*` GitHub runners (10× minute multiplier), and let fingerprinting turn most releases into
OTA updates.

## AI agents

- `AGENTS.md` is the single source of truth for conventions (Copilot, Codex, Cursor, Claude Code
  all read it; `CLAUDE.md` and `.github/copilot-instructions.md` just point to it).
- Install Expo Skills once per machine: `npx skills add expo/skills`
  (Claude Code: `claude plugin install expo@claude-plugins-official`).
- Expo MCP server for live docs, EAS logs and simulator screenshots: https://docs.expo.dev/mcp
- `agent-device` lets agents drive the running app on simulators/devices and capture evidence.

## License

[MIT](./LICENSE) © Stefan Ruvceski
