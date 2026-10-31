# 03 — UI & Design System

**Scope:** Visual code in Hive — theme tokens, text and surfaces, dark mode, native controls, images, icons, animation, pressables, styles. Layout and safe areas: [04](04-responsive-adaptive.md). Accessibility: [12](12-accessibility-platform.md).

**Design reference:** the approved screens and tokens are in [docs/design/](../design/README.md). Build a screen from its reference there (sizes, colors, states); if a screen has none, ask for one before inventing a layout. A PR that changes a screen's look updates its reference in the same PR.

## Non-negotiables

- [ ] Colors only from `src/constants/theme.ts` via `useTheme()` / `ThemedText` / `ThemedView`. (lint)
- [ ] Padding/margin/gap only from `Spacing` tokens.
- [ ] Text through `ThemedText`; colored containers through `ThemedView`.
- [ ] Text never overflows its container, at any system font size.
- [ ] Every screen works in light **and** dark mode.
- [ ] Native controls use `@expo/ui` first.
- [ ] Images via `expo-image` (lint); animation via Reanimated 4 + Gesture Handler (lint for `Animated`/`Easing`).
- [ ] Icons: `SymbolView` with a per-platform name object.
- [ ] One `StyleSheet.create` at the bottom of the file — no `.styles.ts` files.
- [ ] Stable kebab-case `testID` on interactive elements (lint for presence; naming is on you).

---

## 1. Theme tokens — the only source of color and spacing

[src/constants/theme.ts](../../src/constants/theme.ts) turns [docs/design/tokens.md](../design/tokens.md) into code. Change the design first, then the token.

| Export                           | Holds                                                                                                                                                                                                                                   | Read with                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `Colors.light` / `Colors.dark`   | `background`, `text`, `textSecondary`/`Tertiary`/`Quaternary`, `glass` + `glassBorder`, `control` + `controlBorder` + `controlGlyph`, `separator`, `accent`, `accentText`, `accentFill`, `onAccent`, `danger`                           | `useTheme()`, `ThemedText`/`ThemedView` props |
| `Effects.light` / `Effects.dark` | Non-color values: `wallpaper` (radial glows), `tile` (gradient), `glassShadow`/`controlShadow` (drop), `glassHighlight`/`controlHighlight` (inset top edge), `blurTint`, `tileShadow`, `tileBorderAlpha`                                | `useThemeEffects()`                           |
| `AppTints`                       | Per-app glyph/border color, `{ dark, light }`; never the accent teal                                                                                                                                                                    | `AppIcon`                                     |
| `Layout`                         | Design sizes: `screenMargin` 20, `card` 169, `cardPadding` 13, grid gaps 12/14, `minTouch` 44, `listRow` 54 (icon 30/8), `control` 44 (glyph 21), `icon.card` 65/17, `icon.dock` 52/14, `radius` card 30 · sheet 38 · list 26 · dock 34 | import                                        |
| `Spacing`                        | Generic steps `half` 2 … `six` 64 for spacing the design does not name                                                                                                                                                                  | import                                        |
| `Blur`                           | `expo-blur` intensities matching the design's `blur(22px)` / `blur(24px)`                                                                                                                                                               | glass components                              |
| `Fonts`                          | `sans` (system font), `mono`                                                                                                                                                                                                            | `ThemedText`                                  |

Gradients and shadows use React Native's built-in `backgroundImage` / `boxShadow` styles — no gradient library.

### Base components (`src/components/ui/`)

- `Wallpaper` — wrap a whole screen: fixed background glow; glass inside it blurs the glow (Android needs it as the blur target).
- `GlassSurface` — the one glass implementation (blur → token tint → border and highlight on top). `GlassCard`, `GlassButton` and `Collapsible` use it; never re-create glass from `theme.glass`.
- `GlassCard` — frosted surface for cards (`variant="card"`, radius 30) and sheets (`"sheet"`, 38).
- `GlassButton` — round 44 pt control with a symbol and an `aria-label`; Liquid Glass on iOS 26+, blur fallback elsewhere.
- `AppIcon` — tinted tile, `size="card"` (65) or `"dock"` (52), glyph via `SymbolView`.
- `SectionLabel` — section title (heading) or the small group name under a card.
- `PrimaryButton` — accent-filled action (`accent` fill, `onAccent` text, 50 high).

**Never fade glass.** iOS can't blur under a view with `opacity` < 1: put pressed or dimmed opacity on the content inside the glass, never on the glass or a parent of it (see `GlassButton`, Home's module cards).

- Color literals outside `theme.ts`: enforced by `local/no-color-literals` (lint). In components resolve colors with `useTheme()` or Themed\* props, not `Colors.light.x`.
- Spacing is not lint-checked: use `Spacing`; if a step is missing, add it to `theme.ts` in the same PR.
- New colors are added as a **pair** (same key in `light` and `dark`) — a one-sided key drops out of `ThemeColor`.
- No second theming mechanism (styled-components themes, color context providers, NativeWind color classes).

```tsx
// ✅
<View style={[styles.row, { borderBottomColor: theme.separator }]} /> // row: { paddingVertical: Spacing.three }
// ❌
<View style={{ backgroundColor: '#F0F0F3', padding: 16 }} />
```

## 2. ThemedText / ThemedView

- [ThemedText](../../src/components/themed-text.tsx) `type` is the typography scale from the design — never re-specify `fontSize`/`lineHeight`/`fontWeight` inline: `date` 13/600 uppercase (`textTertiary`), `title` 30/700, `section` 17/600, `headline` 20/700, `number` 26/700, `body` 13, `groupLabel` 11/500 (`textQuaternary`), `row` 17 (default, list rows), `listHeader` 15/600 and `footnote` 13/18 (`textQuaternary`) around Settings list groups, `stateTitle` 22/28/700 and `stateBody` 15/21 (`textTertiary`) for empty states, `button` 16/600, `code` 13 mono. Sizes follow the system text size — no caps ([12 §3](12-accessibility-platform.md#3-dynamic-type--font-scaling)).
- Text color via `themeColor` (a `ThemeColor` key), never `style={{ color }}`.
- [ThemedView](../../src/components/themed-view.tsx) `type` = any `ThemeColor` surface, default `background`.
- A recurring new text style = a new `type` in `themed-text.tsx`. Font families from `Fonts`, never string literals.

### Text stays inside its container

RN `Text` defaults to `flexShrink: 0`, so in a row a long string keeps its full width and runs past its parent. `ThemedText` sets `flexShrink: 1` by default — don't override it to `0` except on a short label that must keep its width.

- Label + value rows use [KeyValueRow](../../src/components/ui/key-value-row.tsx): the label keeps its width, the value wraps, and at accessibility text sizes (`fontScale` ≥ 1.5) the value stacks under the label.
- Other rows: give the growing text `flex: 1` (or keep the default shrink) so it has room to wrap.
- Wrap, don't truncate: no `numberOfLines` to "fix" overflow ([12 §3](12-accessibility-platform.md#3-dynamic-type--font-scaling)). Check at the largest system font size. One exception: opaque identifiers (hashes, update ids) stay on one line with `ellipsizeMode="middle"` — wrapped hex is noise (Settings → About).

## 3. Dark mode

- `userInterfaceStyle: 'automatic'` in `app.config.ts` (with `expo-system-ui` for Android) — never lock a scheme.
- Scheme comes from `@/hooks/use-color-scheme` — RN's hook is a lint error. Don't branch on scheme for raw values; add a token pair.
- `<StatusBar style="auto" />` lives in the root layout; never hardcode light/dark.
- Check both schemes before calling UI done (iOS sim `Cmd+Shift+A`; Android `adb shell "cmd uimode night yes|no"`).

## 4. @expo/ui first for native controls

`@expo/ui` renders real SwiftUI / Jetpack Compose. Use it for sheets, pickers, switches, menus, date-time pickers, sliders, segmented controls, progress, and confirmation dialogs.

- PREFER the universal components from `@expo/ui` (import from `@expo/ui` itself; `BottomSheet`, `Button`, `Checkbox`, `Picker`, `Switch`, `Slider`, `TextInput`, `List`, `Icon`, `Host`, `Row`, `Column`, …) — one tree for all platforms. Use `@expo/ui/swift-ui` / `jetpack-compose` only for platform-specific needs and provide the other platform's version ([01 §7](01-architecture.md#7-platform-specific-code)); `swift-ui` renders nothing on Android.
- Segmented choice: [SegmentedControl](../../src/components/ui/segmented-control.tsx) (SwiftUI segmented `Picker` / Compose segmented buttons) — the universal `Picker` has no segmented style.
- Every `@expo/ui` subtree sits in a `Host` (`<Host matchContents><Switch … /></Host>`). Flexbox applies to the `Host` only; inside, lay out with `Row`/`Column` (or `HStack`/`VStack`). Re-entering `@expo/ui` from RN children needs a new `Host` — keep boundaries coarse.
- Fallback only when `@expo/ui` lacks the component: RN built-ins (`Modal`, `Pressable`) or SDK-vetted libs. Before adding a community lib check the drop-ins (`BottomSheet`, `DateTimePicker`, `Menu`, `Picker`, `SegmentedControl`, `Slider`, `PagerView`, `MaskedView`).

## 5. Images — expo-image only

RN `Image`/`ImageBackground` are lint errors — import both from `expo-image`.

- Always set `contentFit`; never `resizeMode`.
- Remote images: `placeholder` (`{ blurhash }`/`{ thumbhash }`, else a themed background) with matching `placeholderContentFit`, and `transition={{ duration: 200, skipOnCacheHit: 'all' }}`.
- In recycling lists, `recyclingKey={item.id}`.
- `cachePolicy`: default `disk`; `memory-disk` for hot images; `none` only for privacy-sensitive content. `priority="high"` only above the fold; `Image.prefetch(urls)` for the next screen. Request sized remote images.
- Meaningful images get `alt`; decorative ones none plus `aria-hidden`. Tint monochrome assets with `tintColor` from the theme.

## 6. Icons — expo-symbols

`SymbolView` renders SF Symbols on iOS and Material Symbols on Android. A bare string name renders **nothing** on Android. (The code also fills the `web` key so the name object type-checks; web is not a target.)

```tsx
// ✅
<SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={theme.text} size={24} />
// ✅ deliberately iOS-only: give a fallback
<SymbolView name="airpods.chargingcase" fallback={<SymbolView name={{ android: 'headphones', web: 'headphones' }} />} />
// ❌
<SymbolView name="trash" />
```

- `tintColor` from `useTheme()`. Weights: `weight={{ ios: 'bold', android: bold }}` with `bold` imported from `expo-symbols/androidWeights/bold`.
- Hive has no tab bar and no tab icons ([02 §5](02-navigation.md#5-layouts-and-stack)). Module icons are the `icon` name objects in `src/modules/registry.ts`, rendered by Home's cards.
- `GlassView` (`expo-glass-effect`) is iOS 26+ only: gate with `isLiquidGlassAvailable()` and ship a fallback — `GlassButton` already does both.

## 7. Animations — Reanimated 4 + Gesture Handler only

RN `Animated`/`Easing` imports are lint errors. `LayoutAnimation` and `PanResponder` are banned too (not lint-caught).

- Never read or write `sharedValue.value` during render (breaks React Compiler); `setState` from a worklet only via `runOnJS`.
- PREFER declarative `entering`/`exiting`/`layout` (`FadeIn`, `LinearTransition`) over hand-rolled mount animations — see [collapsible.tsx](../../src/components/ui/collapsible.tsx).
- Animate `transform`/`opacity`, not layout props, especially in lists. Performance rules: [05](05-performance.md).
- Gate decorative animation behind `useReducedMotion()` ([12](12-accessibility-platform.md)).

## 8. Pressables & feedback

- `Pressable` (or Gesture Handler equivalents); no new `TouchableOpacity`/`TouchableHighlight`.
- Pressed feedback from theme tokens: `style={({ pressed }) => pressed && styles.pressed}` — copy [error-state.tsx](../../src/components/ui/error-state.tsx).
- Haptics: `expo-haptics` is **not installed**. Adding it = `npx expo install expo-haptics` (native dep ⇒ store release, flag it in the PR). Then `Haptics.selectionAsync()` for selection changes, `impactAsync(ImpactFeedbackStyle.Light)` for confirmations. Never on scroll/passive events.

## 9. StyleSheet conventions

- `const styles = StyleSheet.create({ … })` at the **bottom** of the component file; no `.styles.ts`, no inline literals for static styles.
- Dynamic values (theme colors, insets, animated values) merge via arrays — never spread one style into another.
- Keys named by role (`container`, `row`), not appearance (`redBox`). Shared styles ⇒ promote a component, not an exported stylesheet.

## 10. Accessibility & testID (summary — full rules in file 12)

- Roles, accessible names, touch targets, contrast: [12](12-accessibility-platform.md).
- `testID` presence on `Pressable`/`TextInput`/`Switch`/`Touchable*` is enforced by `local/require-testid` (lint). Naming is not: stable, kebab-case, semantic (`submit-order`, `` `hive-card-${id}` ``); never from display text or index alone; never renamed casually — Maestro and RNTL depend on them.

## Common agent mistakes

1. `padding: 16` "just this once" instead of `Spacing`.
2. Bare RN `Text`/`View` with colors where `ThemedText`/`ThemedView` exist — breaks dark mode.
3. A bare SF Symbol string in `SymbolView` — blank icons on Android.
4. Reading `sharedValue.value` during render.
5. `@expo/ui` without a `Host`, or flexbox inside the native context.
6. A JS-styled fake switch/sheet/menu when `@expo/ui` has the native one.
7. Missing `recyclingKey` on `expo-image` in lists.
8. Adding a color to only one scheme.
9. Text in a row without room to shrink — it overflows the card. Use `KeyValueRow` or `flex: 1`.
