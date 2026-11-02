import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { Layout } from '@/constants/theme';

import { type HostView, sameItem, useDrag, type Zone } from '../drag-context';
import { type DragItem } from '../drop-target';

type ZoneProps = { zone: Zone; children: ReactNode; style?: StyleProp<ViewStyle> };

/** Registers its box as a place something can be dropped (a group, a Dock slot, Hidden). */
export function DropZone({ zone, children, style }: ZoneProps) {
  const ref = useRef<HostView>(null);
  useRegisteredZone(zone, ref);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

function useRegisteredZone(zone: Zone | undefined, ref: RefObject<HostView | null>) {
  const register = useDrag()?.register;
  const key = zone ? JSON.stringify(zone) : null;
  useEffect(() => {
    if (!register || key === null) return;
    return register(JSON.parse(key) as Zone, ref);
  }, [register, key, ref]);
}

type Props = {
  item: DragItem;
  /** Also a drop zone: the app's own place in a group or in the Dock. */
  zone?: Zone;
  /** Measured for the lifted copy's place and size when that is not the box that takes the press. */
  liftRef?: RefObject<HostView | null>;
  /** What follows the finger; the same tile or header, drawn again. */
  ghost: ReactNode;
  children: ReactNode;
};

/**
 * Long press (350 ms) lifts the item and a drag moves it; a tap or a scroll that starts before
 * the press passes through untouched, so the tap flows and swipe-back keep working (#48).
 */
export function Draggable({ item, zone, liftRef, ghost, children }: Props) {
  const drag = useDrag();
  const ref = useRef<HostView>(null);
  useRegisteredZone(zone, ref);
  const lifted = sameItem(drag?.active?.item, item);

  const pan = usePanGesture({
    runOnJS: true,
    enabled: drag !== null,
    activateAfterLongPress: Layout.customize.drag.longPressMs,
    onActivate: (event) =>
      drag?.begin(item, liftRef ?? ref, ghost, { x: event.absoluteX, y: event.absoluteY }),
    onUpdate: (event) => drag?.update({ x: event.absoluteX, y: event.absoluteY }),
    onDeactivate: () => drag?.finish(),
    onFinalize: (event) => {
      if (event.canceled) drag?.cancel();
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View
        ref={ref}
        collapsable={false}
        style={lifted ? { opacity: Layout.customize.drag.sourceOpacity } : undefined}>
        {children}
      </View>
    </GestureDetector>
  );
}
