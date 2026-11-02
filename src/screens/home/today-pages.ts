// Home's Today strip (#33): how wide its widgets are, where swiping snaps and how many page dots it
// has. Pure, so the layout rules are table-tested.

import { Layout, MaxContentWidth } from '@/constants/theme';

export type TodayLayout = {
  /** 169, or the strip's width minus its margins at the largest text sizes (one per page). */
  widgetWidth: number;
  /** One widget and the gap after it: swiping snaps per card. */
  step: number;
  /** Scroll positions = page dots; 1 when every widget is in view (no dots). */
  positions: number;
  /** Where each position starts; the last one is clamped to the end of the strip. */
  snapOffsets: number[];
};

/** Padding at both ends of the strip, the gap between widgets, and the design's spacer after the last. */
const margin = Layout.screenMargin;
const gap = Layout.gridGapAcross;
const trailing = gap + Layout.today.endSpacer + margin;

/** `width` is the window's; the strip is capped at MaxContentWidth like the rest of Home. */
export function todayLayout({
  width,
  fontScale,
  count,
}: {
  width: number;
  fontScale: number;
  count: number;
}): TodayLayout {
  const strip = Math.min(width, MaxContentWidth);
  const fullWidth = fontScale >= Layout.today.fullWidthAtFontScale;
  const widgetWidth = fullWidth ? strip - 2 * margin : Layout.card;
  const step = widgetWidth + gap;
  const inView = Math.max(1, Math.floor((strip - 2 * margin + gap) / step));
  const positions = Math.max(1, count - inView + 1);
  const maxScroll = Math.max(0, margin + count * step - gap + trailing - strip);
  const snapOffsets = Array.from({ length: positions }, (_, i) => Math.min(i * step, maxScroll));
  return { widgetWidth, step, positions, snapOffsets };
}

/** The page shown at a scroll offset, kept within the dots. */
export function pageAt(offsetX: number, layout: TodayLayout): number {
  const page = Math.round(offsetX / layout.step);
  return Math.min(layout.positions - 1, Math.max(0, page));
}
