# 04 — Responsive & Adaptive Layout

**Scope:** layout across window sizes, orientation, safe areas, keyboard, font scaling (layout side), pixel density, large screens, and RTL on iOS and Android. Web is not a target ([ADR 0001](../decisions/0001-modules-sqlite-native-only.md)).

## Non-negotiables

- [ ] Layouts are flexbox-first; no screen is designed for one fixed resolution.
- [ ] Window size comes from `useWindowDimensions()`; `Dimensions` is banned (lint).
- [ ] Safe areas come from `react-native-safe-area-context`; no hardcoded notch/status-bar padding.
- [ ] Layout branches on window width (breakpoints), never on `Platform.OS` or device model.
- [ ] Text inputs are never hidden by the keyboard.
- [ ] Text containers grow with OS font scaling (no fixed heights around text).
- [ ] Borders use `StyleSheet.hairlineWidth`; bundled rasters ship @1x/@2x/@3x.
- [ ] Content is capped at `MaxContentWidth` (800) on wide screens.
- [ ] Directional layout uses logical `start`/`end`, never `left`/`right`.

---

## 1. Flexbox-first layout

- Express layout as flex relationships (`flex`, `gap` with `Spacing` tokens, `flexWrap`, percentages, `aspectRatio`). A screen must work from a 320 pt phone to a large Android screen/split-screen window without per-device code.
- **NEVER** give a screen-level container a fixed width/height. Fixed sizes only for intrinsically fixed things (icons, avatars, thumbnails, touch targets).
- `position: 'absolute'` is for overlays (badges, FABs, scrims), never to simulate layout.

```tsx
// ✅ row: { flexDirection: 'row', gap: Spacing.two }, thumb: { width: 64, aspectRatio: 1 }, body: { flex: 1 }
// ❌ body: { width: 311 }
```

## 2. Window dimensions

- `Dimensions` import is banned — enforced by lint (`no-restricted-imports`); it goes stale on rotation/resize. Use `useWindowDimensions()` (also the reactive source for `fontScale` and `scale`).
- **PREFER** `onLayout` when an element depends on _its own_ size, not the window's — containers aren't always window-wide (split view, columns).

## 3. Breakpoints

| Width (pt) | Class                                | Layout                        |
| ---------- | ------------------------------------ | ----------------------------- |
| `< 600`    | phone                                | single column                 |
| `600–1023` | large phone landscape / small tablet | 2 columns where it helps      |
| `≥ 1024`   | tablet landscape / large screens     | master-detail, capped content |

- Branch on **window width** only — an iPad or Android split-screen window can be phone-width.
- Use a small local `const isWide = width >= 600`. Once breakpoint logic recurs in ≥3 screens, promote a `useBreakpoint()` hook in `src/hooks/` — do not add a responsive-UI dependency.
- Breakpoints change **structure** (columns, master-detail, sidebar); flexbox absorbs variance within a breakpoint.

## 4. Safe areas

- Expo Router mounts `SafeAreaProvider` at the root. **NEVER** add another.
- Use `useSafeAreaInsets()` (preferred for custom layouts, composed with `Spacing`) or `SafeAreaView` from `react-native-safe-area-context` with explicit `edges`. **NEVER** `SafeAreaView` from `react-native`.
- Scrollables: apply insets to `contentContainerStyle`, not the scroll view, so content scrolls under system bars but rests clear of them.
- Pad only the edges the navigator doesn't own (`edges={['bottom']}` under a header). Header-less screens (Home) wrap their body in `SafeAreaView` with all four edges — copy [src/screens/home/index.tsx](../../src/screens/home/index.tsx).

```tsx
// ✅
const insets = useSafeAreaInsets();
<View style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, Spacing.three) }}>
// ❌ <View style={{ paddingTop: 59 }}>
```

## 5. Orientation

- **Current config:** `app.config.ts` sets `orientation: 'portrait'` and `ios.supportsTablet: false` — native phones run portrait-only and iPads use phone compatibility mode. The landscape and tablet rules below still apply today to Android large screens/split-screen, and become mandatory on native the day those settings change (a native change ⇒ store release, rule 08 §5).
- **NEVER** lock orientation per screen to work around a layout bug — fix the layout.
- Wherever rotation is possible, verify both orientations: content reachable, no clipped controls. Landscape phones lose height — wrap fixed-height compositions in `ScrollView` rather than shrinking them.
- Derive landscape as `width > height` from `useWindowDimensions()`; add `expo-screen-orientation` only if a feature genuinely needs lock/events.

## 6. Keyboard avoidance

```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={headerHeight} // account for navigator header
>
  <ScrollView keyboardShouldPersistTaps="handled" …>
```

- Exactly one `KeyboardAvoidingView` per screen, wrapping the whole screen body — not individual inputs.
- **MUST** set `keyboardShouldPersistTaps="handled"` on scroll views with inputs (otherwise the submit button needs two taps); consider `keyboardDismissMode="on-drag"` for long forms.
- When `KeyboardAvoidingView` misbehaves on complex forms, the sanctioned upgrade is `react-native-keyboard-controller` (native dep ⇒ store release, 08). Never hand-roll keyboard listeners or hardcode keyboard heights.

## 7. Font scaling (layout)

Accessibility rules — `allowFontScaling`, `maxFontSizeMultiplier` caps, testing at the largest sizes — live in [12 §3](12-accessibility-platform.md#3-dynamic-type--font-scaling). Layout side:

- No fixed heights around text: padding + intrinsic height; `minHeight` over `height`.
- Truly single-line UI (list titles) uses `numberOfLines` + `ellipsizeMode`; never clip multi-line body copy.
- Spacing that must track text size (icon aligned to a text row) can multiply by `useWindowDimensions().fontScale`.

## 8. Pixel density & asset resolution

- Style units are density-independent points; never convert dp↔px manually.
- Bundled rasters ship as `icon.png` / `icon@2x.png` / `icon@3x.png`; `require('./icon.png')` picks the right one. Prefer vector icons (03 §6). Image loading and remote sizing: 03 §5; asset weight: 06.
- **MUST** use `StyleSheet.hairlineWidth` for 1-physical-pixel separators — `borderWidth: 1` is 2–3 physical pixels on high-DPI screens.

## 9. Tablet & large-screen adaptation

- **MUST** cap primary content at `MaxContentWidth` from the theme:

```tsx
// page: { flex: 1, alignItems: 'center' }
// content: { flex: 1, width: '100%', maxWidth: MaxContentWidth }
```

- **PREFER** master-detail at `≥ 1024` for list→detail flows (Android large screens; iPad only once `supportsTablet` is on). Options in order: `@expo/ui/swift-ui` `NavigationSplitView` on iPad, Expo Router Split View where applicable, or a two-pane flex layout keyed off width. The same route must render stacked or side-by-side — state stays URL-addressable.
- Scale up with **structure**, not bigger fonts/paddings. Grid lists derive `numColumns = Math.max(1, Math.floor(width / 360))` and change the FlatList `key` when `numColumns` changes (otherwise it throws on rotation/resize).
- Never assume the app owns the full physical screen — window width is the only truth (split-screen, foldables).

## 10. Web

Not applicable — Hive ships no web UI (iOS + Android only). Never add `*.web.tsx` files ([01 §7](01-architecture.md#7-platform-specific-code)).

## 11. RTL awareness

- Use logical properties (`paddingStart`/`End`, `marginStart`/`End`, `start`/`end`); `left`/`right` only for physically anchored UI.
- Flex `row` auto-flips in RTL — **NEVER** reverse arrays or use `row-reverse` to "fix" RTL, and never build directional layout by string concatenation (`'→' + label`).
- Directional icons (back arrows, chevrons) flip via `I18nManager.isRTL` + `transform: [{ scaleX: -1 }]` or per-direction symbols; non-directional icons must not flip.
- Direction-encoding gestures/animations (swipe toward the trailing edge) derive their sign from `I18nManager.isRTL`.

---

## Common agent mistakes

1. Hardcoding `paddingTop: 44`/`59` "for the notch" instead of `useSafeAreaInsets()`.
2. Adding a second `SafeAreaProvider` or importing `SafeAreaView` from `react-native`.
3. Fixed widths designed against one simulator — overflow on small Androids, float on large screens.
4. Branching layout on `Platform.OS` or device model instead of window-width breakpoints.
5. Fixed `height` on text containers, so text clips at accessibility sizes.
6. Forgetting `keyboardShouldPersistTaps="handled"`.
7. Full-width paragraphs on large screens — missing the `MaxContentWidth` cap.
8. `marginLeft`/`left` for leading-edge layout, or `row-reverse` "for RTL"; deriving `numColumns` without changing the FlatList `key`.
