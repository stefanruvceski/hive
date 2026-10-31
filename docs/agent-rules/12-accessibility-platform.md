# 12 — Accessibility & Platform Conventions

**Scope:** All UI code in this repo — every screen, component, animation, and interaction on iOS and Android (web is not a target). Mandatory for humans and agents. Component-level summary: [src/components/AGENTS.md](../../src/components/AGENTS.md).

## Non-negotiables

- [ ] Every interactive element has a `role`, an accessible name, and relevant `accessibilityState`.
- [ ] Touch targets ≥ 44×44 pt (iOS) / 48×48 dp (Android); `hitSlop` when the visual must be smaller.
- [ ] Text scales with the system font size — never `allowFontScaling={false}`.
- [ ] Contrast meets WCAG AA in **both** themes; color is never the only signal.
- [ ] Non-essential animation is gated behind Reanimated's `useReducedMotion()`.
- [ ] iOS swipe-back and Android back always work.
- [ ] Every interactive or asserted element has a stable kebab-case `testID`. (lint: `local/require-testid`)

---

## 1. RN accessibility API

- **Role on every interactive element** — use the `role` prop. In-app navigation is `button`; `link` is only for external URLs.
- **Accessible name** via `aria-label` when visible text is absent, ambiguous, or icon-only. If a touchable wraps descriptive `Text`, the name derives — don't duplicate it.

```tsx
// ✅ icon-only button
<Pressable role="button" aria-label="Delete hive" testID="delete-hive" onPress={onDelete}>
  <SymbolView name="trash" />
</Pressable>

// ❌ screen reader announces nothing useful
<Pressable onPress={onDelete}><SymbolView name="trash" /></Pressable>
```

- **State via `accessibilityState`** (or `aria-checked`/`aria-selected`/`aria-disabled`/`aria-expanded`/`aria-busy`) — never only in label text or color.
- `accessibilityHint` only when the outcome isn't clear from the label; it describes the result, not the gesture.
- **Group composite controls** (card, row) with `accessible={true}` on one container — never nest accessible elements (iOS disallows it). Hide decorative children (`aria-hidden`).
- Section/screen titles get `role="heading"`. Async results ("Saved") are announced via `accessibilityLiveRegion`/`aria-live` or `AccessibilityInfo.announceForAccessibility`.
- Labels are user-facing copy: sentence case, localized, no "button" suffix.

## 2. Touch targets & hitSlop

- **≥ 44×44 pt iOS, ≥ 48×48 dp Android** — design against 48 when one layout serves both.
- **Add `hitSlop` instead of inflating the visual** (`hitSlop={12}` on a 24 px icon, as in [error-state.tsx](../../src/components/ui/error-state.tsx)). Keep ≥ 8 dp between targets so slop regions don't overlap.

## 3. Dynamic type / font scaling

- **Accessibility stance:** text always scales; **NEVER** set `allowFontScaling={false}` or truncate to "fix" overflow — fix the layout. Caps are a rare exception for genuinely constrained chrome (tab labels, dense badges): `maxFontSizeMultiplier` between 1.3 and 1.5, never on body text and never as a default on `ThemedText`.
- Layout rules (growing containers, single-line titles, `fontScale`) are owned by [04 §7](04-responsive-adaptive.md#7-font-scaling--accessibility-sizes).
- **MUST test at the largest sizes** (iOS Larger Accessibility Sizes, Android Largest) before declaring UI done; nothing truncates, overlaps, or pushes actions off-screen.

## 4. Color contrast

- **AA:** 4.5:1 normal text; 3:1 large text and meaningful UI components/icons/borders.
- **MUST verify in BOTH light and dark themes.** New color pairs are checked against both backgrounds before they enter [src/constants/theme.ts](../../src/constants/theme.ts); color literals in components fail lint (`local/no-color-literals`), so contrast stays auditable in one place.
- **NEVER use color as the only indicator** of error/selected/disabled — pair with text, icon, or `accessibilityState`.

## 5. Screen reader testing (VoiceOver / TalkBack)

**MUST walk every new or changed screen** with VoiceOver (real device preferred; simulator fallback: Xcode Accessibility Inspector) and TalkBack. Checklist:

- [ ] Every interactive element reachable, announced with sensible name + role + state, in logical order.
- [ ] Decorative elements skipped.
- [ ] Modals trap focus (`aria-modal` / `accessibilityViewIsModal`).
- [ ] Dynamic changes announced.
- [ ] Custom gestures (swipe-to-delete) have an AT path via `accessibilityActions` + `onAccessibilityAction`.
- [ ] With `agent-device`, the accessibility snapshot shows labels and roles — gaps there fail Maestro and users alike.

## 6. Reduce motion

- **MUST gate non-essential animation behind `useReducedMotion()` from `react-native-reanimated`** (works on all three platforms). Outside components: `AccessibilityInfo.isReduceMotionEnabled()`.

```tsx
const reduceMotion = useReducedMotion();
return <Animated.View entering={reduceMotion ? undefined : FadeIn}>…</Animated.View>;
```

- Reduce motion ON: instant or opacity-only transitions, no autoplay/looping; keep the information the animation conveyed. Essential motion (progress, direct-manipulation feedback) may stay, toned down.
- `useReducedMotion` does not rerender when the setting changes — fine for gating, don't build toggle UIs on it.

## 7. Focus management on navigation

- Native screen pushes move AT focus automatically — don't fight it. Self-built overlays set `accessibilityViewIsModal`/`aria-modal`, move focus to their first meaningful element (`AccessibilityInfo.setAccessibilityFocus`), and **return focus** to the trigger on close.
- Per-screen announce/refresh work goes in `useFocusEffect` (expo-router), not `useEffect` — it re-runs on back-navigation focus.

## 8. Platform conventions

### iOS

- Icons: SF Symbols via `expo-symbols` (`SymbolView`); native controls via `@expo/ui` ([03 §4–6](03-ui-design-system.md)).
- **Haptics:** `expo-haptics` is **not installed**; adding it is a native change ⇒ store release. Usage rules live in [03 §8](03-ui-design-system.md#8-pressables--feedback).
- **NEVER break swipe-back:** no full-screen horizontal gesture handlers that eat the edge; no `gestureEnabled: false` without product sign-off; blocking flows are presented as modals, not gesture-disabled pushes.
- Safe areas via `react-native-safe-area-context`; never hardcode notch offsets.

### Android

- **Back MUST always do the right thing** (hardware, gesture, predictive). Custom interception never swallows back and still lets the user leave; unsaved-changes guards show a dialog, not a dead end.
- `app.config.ts` sets `android.predictiveBackGestureEnabled: false` (template default). Turning it on is a native change ⇒ store release ([08 §5](08-native-config.md#5-native-change-detection--build-not-ota)) and requires testing every custom back handler.
- Touch feedback: `Pressable` `android_ripple` (bounded) on Android surfaces. Material controls via `@expo/ui`; no iOS-style switches/segmented controls on Android.
- Edge-to-edge is the default: pad with insets, never assume a status bar height; verify with 3-button and gesture nav.

### Web

Not applicable — Hive ships no web UI ([ADR 0001](../decisions/0001-modules-sqlite-native-only.md)).

## 9. Diverge vs stay unified

- **Unified by default:** business logic, data hooks, screen structure, accessibility semantics, testIDs.
- **Diverge deliberately** where platform conventions demand: navigation chrome, control styles (ripple vs highlight), icons, haptics, sheets/menus.
- **Mechanics:** small differences → `Platform.select` inline; structural ones → sibling `file.ios.tsx` / `file.android.tsx` beside `file.tsx` (never `.web.tsx`) **with identical props/exports**. Never branch `Platform.OS` through large JSX; never fork behavior silently.

## Common agent mistakes

1. Icon-only `Pressable` with no `aria-label`/role — invisible to VoiceOver/TalkBack.
2. `role="link"` for in-app navigation — that's a `button`.
3. "Fixing" large-font overflow with `allowFontScaling={false}` or `numberOfLines={1}`.
4. Unguarded entering/exiting/looping animations — check `useReducedMotion()` first.
5. State encoded only visually (red border, gray text) without `accessibilityState` or text.
6. Gesture handlers or `gestureEnabled: false` that break iOS swipe-back; handlers that swallow Android back.
7. Renaming existing `testID`s and silently breaking Maestro flows.
8. Testing only light mode, default font size, one platform, no screen reader.
