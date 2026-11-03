import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { Layout } from '@/constants/theme';

import { type HostView, useListDrag } from './list-drag';
import type { TimeOfDay } from '../../../data/schema';

/**
 * Registers a part of the day (its header-and-card box and its card) as a place rows can drop,
 * and says whether a row is being dragged now (the empty parts then show as drop places).
 */
export function useDropPart(
  timeOfDay: TimeOfDay,
  section: RefObject<HostView | null>,
  card: RefObject<HostView | null>,
  enabled: boolean,
) {
  const drag = useListDrag();
  const register = enabled ? drag?.registerPart : undefined;
  useEffect(() => {
    if (!register) return;
    return register(timeOfDay, section, card);
  }, [register, timeOfDay, section, card]);
  return drag?.active != null;
}

type Props = {
  /** `habit-<id>` or `todo-<id>`. */
  dragKey: string;
  timeOfDay: TimeOfDay;
  /** What follows the finger; the same row, drawn again. */
  ghost: ReactNode;
  children: ReactNode;
};

/**
 * Long press (350 ms) lifts the row and a drag moves it; a tap, a swipe or a scroll that starts
 * before the press passes through untouched, so the checks, swipe buttons and scrolling work (#60).
 */
export function DragRow({ dragKey, timeOfDay, ghost, children }: Props) {
  const drag = useListDrag();
  const ref = useRef<HostView>(null);
  const register = drag?.registerRow;
  useEffect(() => {
    if (!register) return;
    return register(dragKey, timeOfDay, ref);
  }, [register, dragKey, timeOfDay]);
  const lifted = drag?.active?.key === dragKey;

  const pan = usePanGesture({
    runOnJS: true,
    enabled: drag !== null,
    activateAfterLongPress: Layout.listDrag.longPressMs,
    onActivate: (event) =>
      drag?.begin(dragKey, ref, ghost, { x: event.absoluteX, y: event.absoluteY }),
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
        style={lifted ? { opacity: Layout.listDrag.sourceOpacity } : undefined}>
        {children}
      </View>
    </GestureDetector>
  );
}
