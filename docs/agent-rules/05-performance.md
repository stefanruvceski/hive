# 05 — Runtime performance (MANDATORY)

**Scope:** runtime cost of components, lists, re-renders, startup, and memory in Hive (Expo SDK 58, RN 0.88, New Architecture, Hermes, React Compiler on). Target: 60 fps on JS and UI threads, native-feeling startup.

## Non-negotiables

- [ ] No hand-written `useMemo` / `useCallback` / `memo` (lint) — the React Compiler memoizes
- [ ] No synchronous `setState` inside `useEffect` (lint, React Compiler rules)
- [ ] No `.map()` over unbounded arrays inside a `ScrollView` — use `FlatList` (or FlashList if added)
- [ ] Every list has a stable `keyExtractor` (never the index for mutable data); items stay light
- [ ] Animations run in Reanimated worklets (lint bans `Animated`; rules in 03 §7)
- [ ] Splash stays up until first meaningful render; non-critical startup work is deferred
- [ ] Every effect that subscribes or schedules returns a cleanup
- [ ] Submit-only text inputs are uncontrolled (`defaultValue`)
- [ ] Performance claims are verified in a **release build** — never in dev mode or Expo Go

## React Compiler

Rules of React, manual-memo ban and `'use no memo'` opt-out: [11 §11](11-typescript-style.md#11-react-compiler-compliance-rules-of-react). Lint bans `useMemo`/`useCallback`/`memo` imports. Perf-specific part:

- A component that breaks the Rules of React is silently skipped by the compiler and loses **all** memoization — fix the violation rather than adding manual memo.
- Manual memoization is allowed only when a React DevTools Profiler trace shows the compiler missed a hot path; leave a comment citing that evidence.
- Effect-`setState` replacements: derive during render; reset state on identity change with a `key` on the subtree; external/mutable sources via `useSyncExternalStore`; user-triggered logic in the event handler.

## Lists

- **NEVER** `array.map()` large/unbounded data inside a `ScrollView` — it mounts every item.
- Fixed-height `FlatList` rows get `getItemLayout` (skips async measurement).
- `renderItem` is a module-level function or defined once in the body (the compiler stabilizes it); item components are small, no business logic.
- Tune long `FlatList`s with `initialNumToRender` (≈ one screenful), `maxToRenderPerBatch`, `windowSize` (lower = less memory, more blank risk).
- `removeClippedSubviews` is already `true` on Android; don't force it on iOS lists with transformed or absolutely positioned items (drops content).

```tsx
// ❌ <ScrollView>{items.map((i) => <Row key={i.id} item={i} />)}</ScrollView>
// ✅
<FlatList
  data={items}
  keyExtractor={(i) => i.id}
  renderItem={renderRow}
  getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
  initialNumToRender={8}
  windowSize={7}
/>
```

### FlashList (not installed yet — rules for when it is added, v2)

`@shopify/flash-list` is the preferred upgrade for long or heterogeneous lists (recycles instead of remounting). Adding it is a dependency decision (06, 08). With v2:

- **NEVER** put a `key` on an item component or anything inside it — it defeats recycling. For `.map()` inside an item use `useMappingHelper().getMappingKey(id, i)`.
- Items are **recycled, not remounted**: plain `useState` leaks the previous item's state. Use `useRecyclingState(initial, [item.id])`; `useLayoutState` when local state changes item height.
- Pass `getItemType` when rows have very different layouts.
- Don't add `estimatedItemSize` (v1-only; v2 measures). `maintainVisibleContentPosition` is on by default; raise `drawDistance` when prepending many rows.
- Images in recycled rows need `recyclingKey` (03 §5).
- FlashList looks slower than FlatList in dev mode (tiny dev window) — compare only in release builds.

## Re-render hygiene

- Keep state as low as possible — keystroke state must not live in a screen component that also renders a list.
- **PREFER** uncontrolled `TextInput` when the value is only needed at the end. A controlled input round-trips native → JS → re-render per keystroke and can drop characters under JS load. Controlled only for live validation, dependent UI, or format-as-you-type.

  ```tsx
  // ❌ const [q, setQ] = useState(''); <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => search(q)} />
  // ✅ <TextInput defaultValue="" onSubmitEditing={(e) => search(e.nativeEvent.text)} returnKeyType="search" />
  ```

- **PREFER** native `TextInput` props (`maxLength`, `editable`) over JS `onChangeText` filters, which show the raw text for a frame.
- Views carrying content, touch handlers, `testID` or accessibility props can't be flattened by Fabric — don't stack wrapper `View`s where a style merge does the job, especially in list items.
- Split contexts by change frequency, and put setters/dispatch in their own context so action-only consumers never re-render (provider rules: 07 §5).
- Store IDs and derive objects during render instead of duplicating data in state; never chain effects that set state in each other.

## Animations

Owned by [03 §7](03-ui-design-system.md#7-animations--reanimated-4--gesture-handler-only). Perf essentials: animate `transform`/`opacity` on the UI thread, never `setState` per frame, never read `.value` during render.

## Images

Owned by [03 §5](03-ui-design-system.md#5-images--expo-image-only) (`expo-image`, caching, `recyclingKey`, prefetch). Don't download 3000 px images into 60 pt slots — request sized variants.

## Navigation

- Keep the Stack on Expo Router's native navigator; never replace them with JS-driven custom navigators.
- Routes stay thin ([src/app/AGENTS.md](../../src/app/AGENTS.md)); module screens mount only when pushed — don't preload other modules from Home.
- **PREFER** `freezeOnBlur: true` in `screenOptions` for screens with expensive subtrees.
- Don't do heavy synchronous work in a screen's first render during a push — defer it or show a skeleton first.

## Startup time

- `SplashScreen.preventAutoHideAsync()` runs at module scope in `src/app/_layout.tsx`; `hideAsync()` runs once the first frame is ready. When fonts or auth bootstrap are added, move `hideAsync()` after them — never hide before first meaningful render, never leave it on a blank screen.
- Defer non-critical startup work (analytics, secondary prefetch, cache warming) with `InteractionManager.runAfterInteractions` or `requestIdleCallback`.
- **NEVER** run heavy module-top-level code (big JSON parses, crypto, sync storage reads) — it runs at import time, and `_layout.tsx` imports reach everything ([review-lessons L-001](review-lessons.md)).
- **PREFER** `React.lazy()` for heavy components not in the first render. Lazy-loaded modules must be side-effect-free (06, Tree shaking & import rules).
- Metro `inlineRequires` is off in Expo projects (there is no `metro.config.js`). Enable it only together with Expo tree shaking, as a deliberate PR with a verified production export (06, Tree shaking & import rules).
- On Hermes, startup cost still scales with bytecode size and module initialization — dependency weight is a startup cost (06).
- Measure startup like with like: cold vs cold launch, same device, release build, several runs.

## JS thread hygiene

- **NEVER** block the JS thread with heavy synchronous work (sorting/filtering tens of thousands of items, large sync parses) in render, effects, or press handlers. Chunk it, `requestIdleCallback`, move it server-side, or use a worklet/native module.
- Wrap expensive press-triggered work in `requestAnimationFrame(...)` so touch feedback renders first.

## Memory leaks — subscriptions, timers, caches

- **MUST** return a cleanup from every effect that subscribes or schedules (`AppState`/keyboard/emitter/navigation listeners, timers, WebSocket handlers). Leaks show up only as session-long heap growth, which dev testing rarely catches.

  ```tsx
  useEffect(() => {
    const sub = AppState.addEventListener('change', onChange);
    const id = setInterval(poll, 30_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
  ```

- Hunt leaks with the Perf Monitor JS heap readout (steady climb while navigating back and forth) and React Native DevTools → Memory heap snapshots.
- **NEVER** build unbounded in-memory caches in long-lived modules — cap or evict.

## Profiling & measuring

- Release-like build at minimum: `npx expo start --no-dev --minify`. Dev Menu → **Show Perf Monitor** (JS/UI FPS, RAM, JS heap).
- React Native DevTools (`j` in the Expo CLI): Profiler (debug builds only), Memory, Components, Network.
- Native jank: Android Studio Profiler system trace (Perfetto) / Xcode Instruments. JS-thread spans crossing 16 ms → your JS; UI/RenderThread spans → native view workload.
- Report user-perceived metrics (TTI, FPS in key flows), not just render counts. Never time things with `console.log`.

## Hermes specifics

- Use Hermes' built-in `Intl` (`DateTimeFormat`, `NumberFormat`, `RelativeTimeFormat`) instead of locale libraries.

## Data fetching

Owned by [07](07-data-state.md): the global `staleTime: 60_000` lives in `src/lib/query-client.ts` (override per query, 07 §1), no waterfalls, prefetch on navigation intent, `select` to narrow re-renders.

## Production logging

Enforced by lint (`no-console`; `console.error`/`console.warn` allowed). There is no Babel console-stripping plugin — don't leave `console.warn` in hot paths; it still runs in production.

## Common agent mistakes

1. Syncing derived state through effects ("reset on prop change", filtered lists) instead of deriving during render or using a `key`.
2. Rendering lists with `ScrollView` + `.map()`, or `key={index}` on mutable data.
3. Omitting `getItemLayout` on fixed-height FlatLists; adding `estimatedItemSize` to FlashList v2.
4. Profiling in dev mode or Expo Go and "fixing" problems that don't exist in release builds.
5. Hiding the splash too early (white flash) or putting analytics/prefetch in the first-render path.
6. `key` props or plain `useState` inside FlashList items — use `useMappingHelper`/`useRecyclingState`.
7. Making every `TextInput` controlled by reflex.
8. Registering listeners/intervals in effects without a cleanup.
