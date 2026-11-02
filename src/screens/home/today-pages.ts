// Home's Today strip (#33): how wide its widgets are, where swiping snaps and how many page dots it
// has. Pure, so the layout rules are table-tested.

import { Layout, MaxContentWidth } from '@/constants/theme';

export type TodayLayout = {
  /** Space before the first widget: where the group grid starts, so the two line up. */
  inset: number;
  /** 169, or as wide as the group grid at the largest text sizes (one per page). */
  widgetWidth: number;
  /** One widget and the gap after it: swiping snaps per card. */
  step: number;
  /** Scroll positions = page dots; 1 when every widget is in view (no dots). */
  positions: number;
  /** Where each position starts; the last one is clamped to the end of the strip. */
  snapOffsets: number[];
};

const gap = Layout.gridGapAcross;

/**
 * Width of Home's group grid: two 169 pt columns on a phone, more where the window (capped at
 * MaxContentWidth) has room. Centered, so on a phone wider than 390 it starts past the 20 pt margin.
 */
export function homeGridWidth(width: number): number {
  const room = Math.min(width, MaxContentWidth) - 2 * Layout.screenMargin + gap;
  const columns = Math.max(2, Math.floor(room / (Layout.card + gap)));
  return columns * Layout.card + (columns - 1) * gap;
}

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
  const grid = homeGridWidth(width);
  const inset = (strip - grid) / 2;
  const fullWidth = fontScale >= Layout.today.fullWidthAtFontScale;
  const widgetWidth = fullWidth ? grid : Layout.card;
  const step = widgetWidth + gap;
  const inView = Math.max(1, Math.floor((grid + gap) / step));
  const positions = Math.max(1, count - inView + 1);
  // After the last widget: the gap, the design's 8 pt spacer and the inset.
  const trailing = gap + Layout.today.endSpacer + inset;
  const maxScroll = Math.max(0, inset + count * step - gap + trailing - strip);
  const snapOffsets = Array.from({ length: positions }, (_, i) => Math.min(i * step, maxScroll));
  return { inset, widgetWidth, step, positions, snapOffsets };
}

/** The page shown at a scroll offset, kept within the dots. */
export function pageAt(offsetX: number, layout: TodayLayout): number {
  const page = Math.round(offsetX / layout.step);
  return Math.min(layout.positions - 1, Math.max(0, page));
}
