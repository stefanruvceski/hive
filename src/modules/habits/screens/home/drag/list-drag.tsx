// Drag a row of the Habits list (#60): one controller per screen. When a drag starts it measures
// the parts of the day and their rows (in the content's own coordinates), then follows the finger
// with a lifted copy, shows an insertion line, auto-scrolls near the edges and hands the drop to
// `onDrop`. The drop rules are pure, in domain/reorder.ts; the gesture is `DragRow`.
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

import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { liftHaptic } from '@/lib/haptics';

import type { TimeOfDay } from '../../../data/schema';
import {
  type DropTarget,
  hitTest,
  indicatorFor,
  type PartLayout,
  type Rect,
} from '../../../domain/reorder';

/** What a ref to a View holds (the component type itself is not the instance). */
export type HostView = ComponentRef<typeof View>;
type Point = { x: number; y: number };
type Ref = RefObject<HostView | null>;
type SharedNumber = ReturnType<typeof useSharedValue<number>>;

type Active = { key: string; rect: Rect; ghost: ReactNode };
type Session = Active & {
  parts: PartLayout[];
  grab: Point;
  /** The content view's top-left in the scroll view's content, and the scroll view on screen. */
  origin: Point;
  frame: Rect;
};

export type ListDrag = {
  scrollEnabled: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  active: Active | null;
  parts: PartLayout[] | null;
  target: DropTarget | null;
  registerRow: (key: string, timeOfDay: TimeOfDay, ref: Ref) => () => void;
  registerPart: (timeOfDay: TimeOfDay, section: Ref, card: Ref) => () => void;
  begin: (key: string, source: Ref, ghost: ReactNode, at: Point) => void;
  update: (at: Point) => void;
  finish: () => void;
  cancel: () => void;
  motion: { x: SharedNumber; y: SharedNumber; scale: SharedNumber; opacity: SharedNumber };
};

const DragContext = createContext<ListDrag | null>(null);
export const ListDragProvider = DragContext.Provider;
/** Null outside the Habits list's provider, so rows still render (and just don't drag). */
export const useListDrag = () => useContext(DragContext);

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
const nextFrames = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

const sameTarget = (a: DropTarget | null, b: DropTarget | null) =>
  a?.timeOfDay === b?.timeOfDay && a?.index === b?.index;

export function useListDragController({
  scrollRef,
  contentRef,
  onDrop,
}: {
  scrollRef: RefObject<ComponentRef<typeof ScrollView> | null>;
  contentRef: Ref;
  onDrop: (key: string, target: DropTarget) => void;
}): ListDrag {
  const reduceMotion = useReducedMotion();
  const rows = useRef(new Map<symbol, { key: string; timeOfDay: TimeOfDay; ref: Ref }>());
  const parts = useRef(new Map<symbol, { timeOfDay: TimeOfDay; section: Ref; card: Ref }>());
  const scrollY = useRef(0);
  const finger = useRef<Point>({ x: 0, y: 0 });
  const session = useRef<Session | null>(null);
  const starting = useRef(0);
  const targetRef = useRef<DropTarget | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const [active, setActive] = useState<Active | null>(null);
  const [layouts, setLayouts] = useState<PartLayout[] | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const registerRow: ListDrag['registerRow'] = (key, timeOfDay, ref) => {
    const id = Symbol('row');
    rows.current.set(id, { key, timeOfDay, ref });
    return () => void rows.current.delete(id);
  };
  const registerPart: ListDrag['registerPart'] = (timeOfDay, section, card) => {
    const id = Symbol('part');
    parts.current.set(id, { timeOfDay, section, card });
    return () => void parts.current.delete(id);
  };

  const measureParts = async (): Promise<PartLayout[]> => {
    const root = contentRef.current;
    if (!root) return [];
    const rowList = [...rows.current.values()];
    const measured = await Promise.all(
      [...parts.current.values()].map(async ({ timeOfDay, section, card }) => {
        const [rect, cardRect] = await Promise.all([
          section.current ? measureLayout(section.current, root) : null,
          card.current ? measureLayout(card.current, root) : null,
        ]);
        if (!rect || !cardRect) return null;
        const inPart = await Promise.all(
          rowList
            .filter((row) => row.timeOfDay === timeOfDay)
            .map(async ({ key, ref }) => ({
              key,
              rect: ref.current ? await measureLayout(ref.current, root) : null,
            })),
        );
        return {
          timeOfDay,
          rect,
          card: cardRect,
          rows: inPart
            .flatMap((row) => (row.rect ? [{ key: row.key, rect: row.rect }] : []))
            .sort((a, b) => a.rect.y - b.rect.y),
        };
      }),
    );
    return measured.flatMap((part) => (part ? [part] : [])).sort((a, b) => a.rect.y - b.rect.y);
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
    if (s.parts.length === 0) return;
    const next = hitTest(s.key, point.y, s.parts);
    if (!sameTarget(next, targetRef.current)) {
      targetRef.current = next;
      setTarget(next);
    }
  };

  const stop = () => clearInterval(scrollTimer.current);

  const clear = () => {
    stop();
    session.current = null;
    targetRef.current = null;
    setActive(null);
    setLayouts(null);
    setTarget(null);
  };

  useEffect(() => stop, []);

  const begin: ListDrag['begin'] = (key, source, ghost, at) => {
    finger.current = at;
    const token = ++starting.current;
    const root = contentRef.current;
    const scroller = scrollRef.current;
    const sourceView = source.current;
    if (!root || !scroller || !sourceView) return;
    void Promise.all([
      measureLayout(sourceView, root),
      measureWindow(root),
      measureWindow(scroller),
    ]).then(async ([rect, rootWindow, frame]) => {
      // The gesture may have ended while the measuring was under way.
      if (!rect || token !== starting.current) return;
      const origin = { x: rootWindow.x, y: rootWindow.y - frame.y + scrollY.current };
      const grab = {
        x: at.x - origin.x - rect.x,
        y: at.y - frame.y + scrollY.current - origin.y - rect.y,
      };
      session.current = { key, rect, ghost, parts: [], grab, origin, frame };
      x.set(rect.x);
      y.set(rect.y);
      liftHaptic();
      const { liftScale, liftOpacity } = Layout.listDrag;
      scale.set(reduceMotion ? 1 : withTiming(liftScale));
      opacity.set(liftOpacity);
      // The empty parts of the day appear as drop places; measure once they are laid out.
      setActive({ key, rect, ghost });
      await nextFrames();
      const s = session.current;
      if (!s || token !== starting.current) return;
      s.parts = await measureParts();
      if (session.current !== s || token !== starting.current) return;
      setLayouts(s.parts);
      follow();
      scrollTimer.current = setInterval(() => {
        const { edge, scrollStep } = Layout.listDrag;
        const live = session.current;
        if (!live) return;
        const above = finger.current.y < live.frame.y + edge;
        const below = finger.current.y > live.frame.y + live.frame.height - edge;
        const by = above ? -scrollStep : below ? scrollStep : 0;
        if (by !== 0) {
          scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + by), animated: false });
        }
      }, 16);
    });
  };

  const update: ListDrag['update'] = (at) => {
    finger.current = at;
    follow();
  };

  /** Ends the drag: the drop goes out, or the copy just disappears. */
  const end = (apply: boolean) => {
    starting.current += 1;
    const s = session.current;
    const dropAt = targetRef.current;
    clear();
    if (apply && s && dropAt) onDrop(s.key, dropAt);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
    follow();
  };

  return {
    scrollEnabled: active === null,
    onScroll,
    active,
    parts: layouts,
    target,
    registerRow,
    registerPart,
    begin,
    update,
    finish: () => end(true),
    cancel: () => end(false),
    motion: { x, y, scale, opacity },
  };
}

/** The lifted copy and the insertion line; last child of the content view. */
export function DragLayer() {
  const drag = useListDrag();
  if (!drag || !drag.active) return null;
  return <LayerContent drag={drag} active={drag.active} />;
}

function LayerContent({ drag, active }: { drag: ListDrag; active: Active }) {
  const theme = useTheme();
  const { x, y, scale, opacity } = drag.motion;
  // Physical left / top: these are measured coordinates, not layout in a direction.
  const lifted = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
    opacity: opacity.get(),
  }));
  const line = drag.parts && drag.target ? indicatorFor(active.key, drag.target, drag.parts) : null;
  const thickness = Layout.listDrag.indicator;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="habits-drag-layer">
      <Animated.View
        style={[{ position: 'absolute', left: 0, top: 0, width: active.rect.width }, lifted]}
        testID="habits-drag-ghost">
        {active.ghost}
      </Animated.View>
      {/* Over the lifted copy, which is right on top of the place it would drop. */}
      {line && (
        <View
          style={{
            position: 'absolute',
            left: line.x,
            top: line.y - thickness / 2,
            width: line.width,
            height: thickness,
            borderRadius: thickness,
            backgroundColor: theme.accent,
          }}
          testID="habits-drop-indicator"
        />
      )}
    </View>
  );
}
