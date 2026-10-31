# 13 — Security

**Scope:** Hive-specific security and privacy decisions — secrets, token storage, network, deep links, auth, WebViews, API-route trust boundaries, OTA integrity, supply chain, PII (Expo SDK 58, iOS/Android — no web UI). Error handling and logging mechanics live in [14-errors-resilience.md](14-errors-resilience.md).

## Non-negotiables

- [ ] NO secret in the client: not in source, `EXPO_PUBLIC_*`, `eas.json`, or app config `extra` (§1). Committed secrets: gitleaks **(CI)**.
- [ ] Tokens on-device: `expo-secure-store` or memory only — never AsyncStorage, Zustand, or a persisted cache (§2).
- [ ] `https://` only; no tokens/PII in URLs, query strings, or logs.
- [ ] Deep-link params are untrusted: validate; never navigate to, open, or fetch a raw param (§4).
- [ ] OAuth = `expo-auth-session` (PKCE) + system browser; never a WebView or embedded client secret (§5).
- [ ] API routes authenticate and authorize per resource on the server (§7–8).
- [ ] Only the pipeline publishes OTA updates (§9).
- [ ] New dependencies are vetted by hand (§10); audit/OSV/gitleaks run on every PR **(CI)**.
- [ ] No PII or tokens in logs, analytics, or crash reports (§12, [14 §6](14-errors-resilience.md)).

---

## 1. Secret management

Anything client-reachable (bundle, `EXPO_PUBLIC_*`, app config, assets) is plaintext to anyone with the app. EAS `sensitive`/`secret` visibility protects the build pipeline, not the shipped app ([08 §9](08-native-config.md)).

- Privileged resources (third-party keys, signing/webhook secrets) are proxied through an API route holding the secret under a non-`EXPO_PUBLIC_` name ([07 §10](07-data-state.md); env mechanics [01 §5](01-architecture.md)).
- `process.env` only in `src/lib/env.ts` and `src/app/api/**` **(lint)**.
- A committed secret is leaked: rotate it — deleting the commit is not enough. gitleaks scans PRs, `main`, weekly **(CI)**.

## 2. Token & sensitive-data storage

The storage decision table is in [07 §8](07-data-state.md). Security facts on top of it:

- AsyncStorage is unencrypted — that includes indirectly persisting a Zustand store or query cache holding auth state.
- **iOS Keychain survives uninstall** (same bundle ID): a token found on first launch may be stale — validate it server-side; "fresh install" ≠ "signed out". Android values do not survive uninstall; keep `configureAndroidBackup: true` so SecureStore stays out of Auto Backup.
- `requireAuthentication: true` values are invalidated when biometrics change and the prompt can fail — wrap reads in `try/catch` and treat failure as an auth outcome.
- Store tokens, not blobs (large values can be rejected).
- SecureStore-on-web: not applicable — Hive ships no web UI. Never put tokens or secrets in SQLite (`hive.db` is unencrypted) ([07 §8](07-data-state.md)).
- PREFER not persisting at all: access token in memory, only the refresh token in SecureStore.

## 3. Network security

- `https://` everywhere. Never add ATS exceptions or `usesCleartextTraffic` to "make it work" — fix the endpoint.
- All client HTTP goes through `api<T>()` in [src/lib/api.ts](../../src/lib/api.ts) — the one choke point for auth headers. `fetch` elsewhere: **(lint)**.
- Sensitive data goes in headers (`Authorization`) or POST bodies, never query strings (URLs land in server logs, proxies, analytics, browser history).
- **Certificate pinning:** not implemented, deliberately. A rotated server cert would brick networking in every shipped binary until a store release. Do NOT add it unilaterally — it's a native change ([08 §5](08-native-config.md)) and needs an owner for rotation.

## 4. Deep links & incoming URLs

Custom schemes have no registry — any app can claim `hive://`. Treat every inbound URL and param as attacker-controlled.

- NEVER send or accept tokens, session IDs, or PII in deep links.
- Validate every `useLocalSearchParams()` value (shape/allowlist; params are `string | string[]`) before use. Never interpolate raw params into URLs, queries, or `router` hrefs.
- NEVER `router.push(params.next)` / `Linking.openURL(params.url)` / fetch a param URL. Allowlist exact destinations.

```tsx
const { id } = useLocalSearchParams<{ id: string }>();
const hiveId = typeof id === 'string' && /^[a-z0-9-]{1,40}$/i.test(id) ? id : null;
if (!hiveId) return <Redirect href="/" />;
```

- A deep link can land on any screen: those screens re-check auth (protected routes/redirects), and the server still enforces access (§8).
- PREFER Universal Links / App Links (domain-verified) for anything security-adjacent; associated domains are a native change ([08 §5](08-native-config.md)).

## 5. Authentication

- OAuth/OIDC: `expo-auth-session` + `expo-web-browser` (system browser, shared cookies). Both are native deps ([08 §4](08-native-config.md)). Use the provider's SDK (Google, Apple, Facebook) when one exists; `expo-auth-session` is the fallback.
- PKCE stays on (`usePKCE: true`, `S256` — the default); never `CodeChallengeMethod.Plain`. It is what makes a hijacked redirect (§4) useless.
- NEVER embed a `clientSecret` — there is no safe client-side storage for it. If the provider needs one for code exchange, do the exchange in an API route.
- Tokens: access in memory, refresh in SecureStore (§2). 401/403 → sign-in flow ([14 §3](14-errors-resilience.md)).

## 6. WebView hygiene (if ever introduced)

`react-native-webview` is not installed; adding it is a native change. If required: exact `https://` `originWhitelist` (never `['*']`), no secrets via `injectedJavaScript`, validate `origin` + shape on every `postMessage`, `javaScriptEnabled` off unless needed, no file access for remote content, never render user- or param-supplied URLs/HTML.

## 7. Input validation at trust boundaries

The client is not a trust boundary — anyone can `curl` an API route.

- API routes validate every input (body, query, route params, headers) and return 400 on bad input. Client validation is UX only ([07 §7](07-data-state.md)).
- PREFER schema validation (e.g. `zod`, pure JS) at the top of each handler once input is non-trivial.
- Encode on output (`encodeURIComponent`, framework escaping); never build SQL/shell/HTML by concatenating user input.

## 8. API-route security (`src/app/api/*+api.ts`)

Mechanics: [07 §10](07-data-state.md). Error shape: [14 §7](14-errors-resilience.md). Security on top:

- **Authn + authz on every non-public route.** Verify the session server-side (signature + expiry), then ownership of _that_ resource (no IDOR: `/api/hives/[id]` checks the hive belongs to the caller). 401 unauthenticated / 403 unauthorized. PREFER a shared guard helper.
- **Rate limiting:** Expo Router has none. Abusable routes (auth attempts, email sends, expensive queries) need it at the host/middleware layer before shipping — at minimum, state the exposure in the PR.
- **CORS:** same-origin needs nothing; never `Access-Control-Allow-Origin: *` "just in case". Cross-origin = exact origins/methods/headers.
- **Cookies:** `Secure; HttpOnly; SameSite=Lax` (or `Strict`).
- Never import `src/app/api/` files from client code.

## 9. OTA update integrity

- An OTA update is remote code execution on every user's device; publishing rights are production credentials. Production updates come only from the pipeline ([10-ci-release.md](10-ci-release.md), [08 §6](08-native-config.md)) — never `eas update --channel production` by hand. Store submits sit behind `require-approval` jobs in `.eas/workflows/deploy-to-production.yml`.
- The `fingerprint` policy guarantees runtime compatibility, not authenticity. EAS Update **code signing** is not enabled (paid plan + key management); enabling it is a native change and process decision — propose, don't do.
- EAS account: 2FA, no shared tokens, EAS secrets never echoed in logs.

## 10. Supply-chain / dependency hygiene

Install mechanics: [08 §4](08-native-config.md).

**Automated — don't re-implement:**

- `pnpm-workspace.yaml`: `minimumReleaseAge: 4320` (no versions younger than 3 days) and dependency build scripts blocked (`onlyBuiltDependencies: []`; reviewed skips in `ignoredBuiltDependencies`).
- `.github/workflows/security.yml` (PR, `main`, weekly): `pnpm audit --prod --audit-level=high`, OSV-Scanner on `pnpm-lock.yaml`, gitleaks.
- Renovate: 3-day `minimumReleaseAge`, GitHub Actions pinned to SHA digests, Expo SDK grouped behind dashboard approval.
- CODEOWNERS: maintainer review on `package.json`, `pnpm-workspace.yaml`, `renovate.json` and other guardrail files.

**Still manual — your job when adding a dependency:**

- Verify the **exact** package name (typosquats are one letter off) and check maintenance (React Native Directory for native, downloads + repo activity for JS). A one-function package isn't worth a trust decision — write the function.
- If it needs an install script, read the script before adding it to `onlyBuiltDependencies`, and say why in the PR.
- No deps from git URLs or tarballs of unknown provenance.
- `pnpm-lock.yaml` is the integrity record: commit it, never hand-edit or delete/regenerate it, never `--no-lockfile`.
- Triage audit findings (fix, upgrade, or document the false positive); CI gates only prod high+.

## 11. Jailbreak/root & binary protection

- Any binary can be decompiled; Hermes bytecode is not protection. Do NOT add root/jailbreak detection or anti-tamper libs speculatively (bypassable, native dep, false positives). Real controls: server authz (§8), no client secrets (§1); platform attestation (`expo-app-integrity`) only as a proposed product decision for high-risk features.

## 12. Privacy

- NEVER send PII (names, emails, locations, tokens, user content) to logs, analytics, or crash reporters. When Sentry/analytics is added ([14 §6](14-errors-resilience.md)), configure scrubbing before the first event: request bodies, URLs with params, user context.
- Collect the minimum; every stored field has a purpose. Stop collecting ⇒ delete the code and the data.
- **iOS privacy manifests:** required-reason APIs go in `ios.privacyManifests` in [app.config.ts](../../app.config.ts); for a third-party native lib, merge reasons from `node_modules/<pkg>/ios/PrivacyInfo.xcprivacy`. An Apple "missing reasons" email is a bug.
- Permissions: minimum set, honest purpose strings, requested in context ([08 §7](08-native-config.md)).
- Screenshot blocking (`expo-screen-capture`) only for a real requirement — native dep, propose first.

---

## Common agent mistakes

1. A "dev key" in `EXPO_PUBLIC_*`/`.env`/`eas.json`, or assuming EAS `secret` visibility protects a value inside the app.
2. A token in AsyncStorage, Zustand, or a persisted query cache "temporarily".
3. Treating an iOS fresh install as signed out — the Keychain survived; validate server-side.
4. `router.push(params.next)` / `Linking.openURL(params.url)` from unvalidated params.
5. OAuth in a WebView, PKCE disabled, or a `clientSecret` in `AuthRequestConfig`.
6. `Access-Control-Allow-Origin: *` or an ATS/cleartext exception to "fix" a connection error.
7. An API route that checks "logged in" but not "owns this resource" (IDOR), or trusts client-validated input.
8. Tokens/PII in query strings or in logged request/response objects.
9. A lookalike package name, an unread install script allow-listed, or a deleted/regenerated lockfile to resolve a conflict.
10. Cert pinning, root detection, screenshot blocking, or OTA code signing added unilaterally; publishing an EAS Update outside the pipeline.
