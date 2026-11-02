// Customize Home drag and drop (#48): one controller per screen. It knows where every drop zone
// is (measured when a drag starts, in the content's own coordinates), follows the finger with a
// lifted copy, auto-scrolls near the edges and hands the final edit to `onDrop`. The gesture
// itself lives in components/draggable.tsx; this file never reads a shared value during render.
import {
  type ComponentRef,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HomeEdit } from '@/utils/home-edits';

import {
  type DragItem,
  type DropTarget,
  dropToEdit,
  hitTest,
  indicatorFor,
  type Layouts,
  type Point,
  type Rect,
} from './drop-target';

/** What a ref to a View holds (the component type itself is not the instance). */
export type HostView = ComponentRef<typeof View>;

export type Zone =
  | { type: 'group'; groupId: string }
  | { type: 'app'; groupId: string; moduleId: string }
  | { type: 'dock'; slot: number }
  | { type: 'hidden' };

type Active = { item: DragItem; rect: Rect; ghost: ReactNode };
type Session = Active & {
  layouts: Layouts;
  grab: Point;
  /** The content view's top-left in the scroll view's content, and the scroll view on screen. */
  origin: Point;
  frame: Rect;
};

export type DragController = {
  scrollEnabled: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  active: Active | null;
  layouts: Layouts | null;
  target: DropTarget | null;
  pinnedCount: number;
  register: (zone: Zone, ref: RefObject<HostView | null>) => () => void;
  begin: (item: DragItem, source: RefObject<HostView | null>, ghost: ReactNode, at: Point) => void;
  update: (at: Point) => void;
  finish: () => void;
  cancel: () => void;
  motion: { x: SharedNumber; y: SharedNumber; scale: SharedNumber; opacity: SharedNumber };
};
type SharedNumber = ReturnType<typeof useSharedValue<number>>;

const DragContext = createContext<DragController | null>(null);
export const DragProvider = DragContext.Provider;
/** Null outside Customize's provider, so tiles still render (and just don't drag). */
export const useDrag = () => useContext(DragContext);

const measureLayout = (view: HostView, relativeTo: HostView) =>
  new Promise<Rect | null>((resolve) =>
    view.measureLayout(
      relativeTo,
      (x, y, width, height) => resolve({ x, y, width, height }),
      () => resolve(null),
    ),
  );
const measureWindow = (view: HostView) =>
  new Promise<Rect>((resolve) =>
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height })),
  );

export function sameItem(a: DragItem | undefined, b: DragItem) {
  if (!a || a.kind !== b.kind) return false;
  return a.kind === 'app' && b.kind === 'app'
    ? a.moduleId === b.moduleId
    : a.kind === 'group' && b.kind === 'group' && a.groupId === b.groupId;
}

export function useDragController({
  scrollRef,
  contentRef,
  pinnedCount,
  onDrop,
}: {
  scrollRef: RefObject<ComponentRef<typeof ScrollView> | null>;
  contentRef: RefObject<HostView | null>;
  pinnedCount: number;
  onDrop: (edit: HomeEdit) => void;
}): DragController {
  const reduceMotion = useReducedMotion();
  const zones = useRef(new Map<symbol, { zone: Zone; ref: RefObject<HostView | null> }>());
  const scrollY = useRef(0);
  const finger = useRef<Point>({ x: 0, y: 0 });
  const session = useRef<Session | null>(null);
  const starting = useRef(0);
  const targetRef = useRef<DropTarget | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [active, setActive] = useState<Active | null>(null);
  const [layouts, setLayouts] = useState<Layouts | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const register = (zone: Zone, ref: RefObject<HostView | null>) => {
    const id = Symbol('zone');
    zones.current.set(id, { zone, ref });
    return () => void zones.current.delete(id);
  };

  const measureZones = async (): Promise<Layouts> => {
    const root = contentRef.current;
    const measured = await Promise.all(
      [...zones.current.values()].map(async ({ zone, ref }) => ({
        zone,
        rect: root && ref.current ? await measureLayout(ref.current, root) : null,
      })),
    );
    const found = measured.flatMap(({ zone, rect }) => (rect ? [{ zone, rect }] : []));
    const rowThenColumn = (a: Rect, b: Rect) => a.y - b.y || a.x - b.x;
    const groups = found
      .flatMap(({ zone, rect }) => (zone.type === 'group' ? [{ id: zone.groupId, rect }] : []))
      .sort((a, b) => rowThenColumn(a.rect, b.rect))
      .map((group) => ({
        ...group,
        apps: found
          .flatMap(({ zone, rect }) =>
            zone.type === 'app' && zone.groupId === group.id
              ? [{ moduleId: zone.moduleId, rect }]
              : [],
          )
          .sort((a, b) => rowThenColumn(a.rect, b.rect)),
      }));
    const dock = found
      .flatMap(({ zone, rect }) => (zone.type === 'dock' ? [{ slot: zone.slot, rect }] : []))
      .sort((a, b) => a.slot - b.slot)
      .map(({ rect }) => rect);
    const hidden = found.find(({ zone }) => zone.type === 'hidden')?.rect ?? null;
    return { groups, dock, hidden };
  };

  /** Moves the lifted copy under the finger and finds the place it would drop on. */
  const follow = () => {
    const s = session.current;
    if (!s) return;
    const point = {
      x: finger.current.x - s.origin.x,
      y: finger.current.y - s.frame.y + scrollY.current - s.origin.y,
    };
    x.set(point.x - s.grab.x);
    y.set(point.y - s.grab.y);
    const next = hitTest(s.item, point, s.layouts, { pinnedCount });
    if (JSON.stringify(next) !== JSON.stringify(targetRef.current)) {
      targetRef.current = next;
      setTarget(next);
    }
  };

  const stop = () => {
    clearInterval(scrollTimer.current);
    clearTimeout(settleTimer.current);
  };

  const clear = () => {
    stop();
    session.current = null;
    targetRef.current = null;
    setActive(null);
    setLayouts(null);
    setTarget(null);
  };

  useEffect(() => stop, []);

  const begin: DragController['begin'] = (item, source, ghost, at) => {
    finger.current = at;
    const token = ++starting.current;
    const root = contentRef.current;
    const scroller = scrollRef.current;
    const sourceView = source.current;
    if (!root || !scroller || !sourceView) return;
    void Promise.all([
      measureLayout(sourceView, root),
      measureZones(),
      measureWindow(root),
      measureWindow(scroller),
    ]).then(([rect, all, rootWindow, frame]) => {
      // The gesture may have ended while the measuring was under way.
      if (!rect || token !== starting.current) return;
      const origin = { x: rootWindow.x, y: rootWindow.y - frame.y + scrollY.current };
      const grab = {
        x: at.x - origin.x - rect.x,
        y: at.y - frame.y + scrollY.current - origin.y - rect.y,
      };
      session.current = { item, rect, ghost, layouts: all, grab, origin, frame };
      x.set(rect.x);
      y.set(rect.y);
      scale.set(reduceMotion ? 1 : withTiming(Layout.customize.drag.liftScale));
      opacity.set(Layout.customize.drag.liftOpacity);
      setLayouts(all);
      setActive({ item, rect, ghost });
      follow();
      scrollTimer.current = setInterval(() => {
        const { edge, scrollStep } = Layout.customize.drag;
        const s = session.current;
        if (!s) return;
        const above = finger.current.y < s.frame.y + edge;
        const below = finger.current.y > s.frame.y + s.frame.height - edge;
        const by = above ? -scrollStep : below ? scrollStep : 0;
        if (by !== 0) {
          scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + by), animated: false });
        }
      }, 16);
    });
  };

  const update: DragController['update'] = (at) => {
    finger.current = at;
    follow();
  };

  /** Ends the drag: the edit goes out, or the copy settles back where it was. */
  const end = (apply: boolean) => {
    starting.current += 1;
    const s = session.current;
    if (!s) return;
    const edit = apply ? dropToEdit(s.item, targetRef.current) : null;
    stop();
    if (edit) {
      clear();
      onDrop(edit);
      return;
    }
    if (reduceMotion) return clear();
    x.set(withTiming(s.rect.x, { duration: Layout.customize.drag.settleMs }));
    y.set(withTiming(s.rect.y, { duration: Layout.customize.drag.settleMs }));
    settleTimer.current = setTimeout(clear, Layout.customize.drag.settleMs);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
    follow();
  };

  return {
    scrollEnabled: active === null,
    onScroll,
    active,
    layouts,
    target,
    pinnedCount,
    register,
    begin,
    update,
    finish: () => end(true),
    cancel: () => end(false),
    motion: { x, y, scale, opacity },
  };
}

/** The lifted copy, the drop indicator and the "Dock full" note; last child of the content view. */
export function DragLayer() {
  const drag = useDrag();
  const theme = useTheme();
  const { x, y, scale, opacity } = drag?.motion ?? { x: null, y: null, scale: null, opacity: null };
  if (!drag || !drag.active || !drag.layouts || !x || !y || !scale || !opacity) return null;
  return (
    <LayerContent
      drag={drag}
      color={drag.target?.kind === 'dock-full' ? theme.danger : theme.accent}
      motion={{ x, y, scale, opacity }}
    />
  );
}

function LayerContent({
  drag,
  color,
  motion,
}: {
  drag: DragController;
  color: string;
  motion: DragController['motion'];
}) {
  const { active, layouts, target } = drag;
  const { x, y, scale, opacity } = motion;
  const tokens = Layout.customize.drag;
  // Physical left / top: these are measured coordinates, not layout in a direction.
  const lifted = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
    opacity: opacity.get(),
  }));
  if (!active || !layouts) return null;
  const indicator = indicatorFor(
    active.item,
    target,
    layouts,
    tokens.indicator,
    tokens.indicatorGap,
  );
  const full = target?.kind === 'dock-full' ? layouts.dock : [];
  const first = layouts.dock[0];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="customize-drag-layer">
      {indicator && (
        <View
          style={[
            styles.at(indicator.rect),
            indicator.shape === 'bar'
              ? { backgroundColor: color, borderRadius: tokens.indicator }
              : {
                  borderColor: color,
                  borderWidth: tokens.indicator,
                  borderRadius: tokens.outlineRadius,
                },
          ]}
          testID="customize-drop-indicator"
        />
      )}
      {full.map((rect, slot) => (
        <View
          key={slot}
          style={[
            styles.at(rect),
            {
              borderColor: color,
              borderWidth: tokens.indicator,
              borderRadius: tokens.outlineRadius,
            },
          ]}
        />
      ))}
      {first && target?.kind === 'dock-full' && (
        <ThemedText
          type="footnote"
          style={[styles.label, { left: first.x, top: first.y - tokens.labelGap, color }]}
          testID="customize-dock-full">
          Dock full
        </ThemedText>
      )}
      <Animated.View style={[styles.at(active.rect, true), lifted]} testID="customize-drag-ghost">
        {active.ghost}
      </Animated.View>
    </View>
  );
}

const styles = {
  at: (rect: Rect, ghost = false) => ({
    position: 'absolute' as const,
    left: ghost ? 0 : rect.x,
    top: ghost ? 0 : rect.y,
    width: rect.width,
    height: rect.height,
  }),
  ...StyleSheet.create({ label: { position: 'absolute' } }),
};
