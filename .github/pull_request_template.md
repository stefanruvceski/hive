## What

<!-- One or two sentences. Link the issue if there is one. -->

## Why

## How to test

<!-- Steps for a reviewer. The PR preview comment has a QR code for a dev build. -->

## Size impact

<!-- New dependency or asset? State the before/after delta (docs/agent-rules/06). Otherwise: "none". -->

## Areas affected / verify after merge

<!-- What could regress; concrete things to check after merge/deploy. -->

## Checklist

- [ ] `pnpm check` passes locally (typecheck + lint + test)
- [ ] `pnpm deps:check` clean (required after any dependency change)
- [ ] Native code / config plugin / `app.config.ts` / `eas.json` changed → **"requires store release" stated above** (fingerprint change — no OTA; docs/agent-rules/10)
- [ ] New `expo-*` or native dependency added with `npx expo install`
- [ ] Verified on iOS **and** Android (simulator is fine), light **and** dark mode
- [ ] AGENTS.md / docs/agent-rules updated if a convention changed
