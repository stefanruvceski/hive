# src/components — reusable UI

Components used by two or more screens or modules. `ui/` holds lower-level primitives: the design's base components (`Wallpaper`, `GlassSurface`, `GlassCard`, `GlassButton`, `AppIcon`, `SectionLabel`, `PrimaryButton`), loading/error/empty states, collapsible. Build new UI from them instead of re-creating glass or tiles, and never put `opacity` on glass or its parents (iOS stops blurring) — fade the content inside. Never import from `src/app`, `src/screens` or `src/modules` (lint enforces it).

- **Theme only.** Text via `ThemedText` (pick a `type`, color via `themeColor`), surfaces via `ThemedView`, spacing via `Spacing`, colors via `useTheme()`. Color literals fail lint ([03 §1–2](../../docs/agent-rules/03-ui-design-system.md)).
- **Text never overflows its container.** `ThemedText` shrinks by default — don't set `flexShrink: 0` on growing text; label + value rows use `ui/key-value-row.tsx`; wrap, never truncate ([03 §2](../../docs/agent-rules/03-ui-design-system.md)).
- **Styles** in one `StyleSheet.create` at the bottom of the file; dynamic values merged with style arrays. No `.styles.ts` files.
- **Interactive elements** are `Pressable` with `role`, an accessible name (`aria-label` when there is no visible text), pressed feedback, a ≥44 pt / 48 dp target (`hitSlop`), and a stable kebab-case `testID` (lint enforces `testID`). Copy `ui/error-state.tsx` ([12](../../docs/agent-rules/12-accessibility-platform.md)).
- **Native look first:** `@expo/ui` for switches, pickers, sheets and menus; `expo-image` for images; `SymbolView` with per-platform names for icons; Reanimated for animation, gated by `useReducedMotion()` ([03 §4–7](../../docs/agent-rules/03-ui-design-system.md)).
- **Platform splits** (rare) use sibling `foo.ios.tsx` / `foo.android.tsx` files with identical props and exports — change them together. iOS + Android only: never add `.web.tsx` ([01 §7](../../docs/agent-rules/01-architecture.md)).
- Friendly copy only: never render a raw server or exception message.
