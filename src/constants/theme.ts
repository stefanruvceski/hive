/**
 * Hive's design tokens, from the approved design (docs/design/tokens.md and `renderVals()` in
 * docs/design/canvas/Main.dc.html). Change a value there first, then here.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#EEF2F5',
    text: '#0F172A',
    textSecondary: '#334155',
    textTertiary: '#475569',
    textQuaternary: '#64748B',
    /** Cards and sheets. */
    glass: 'rgba(255,255,255,0.62)',
    glassBorder: 'rgba(15,23,42,0.07)',
    /** Round glass buttons and the Dock. */
    control: 'rgba(255,255,255,0.70)',
    controlBorder: 'rgba(15,23,42,0.10)',
    controlGlyph: '#1E293B',
    separator: 'rgba(15,23,42,0.08)',
    /** Fills: primary buttons, switches, active dot, selection ring. */
    accent: '#2DD4BF',
    /** Teal text and icons (light needs the darker shade for contrast). */
    accentText: '#0F766E',
    /** Faint teal behind a list-row icon (Settings). */
    accentFill: 'rgba(45,212,191,0.22)',
    /** Segmented control: track, chosen segment fill and its border. */
    segmentTrack: 'rgba(15,23,42,0.06)',
    segmentSelected: 'rgba(45,212,191,0.22)',
    segmentSelectedBorder: 'rgba(45,212,191,0.55)',
    /** Switch: track when off, and the knob. */
    switchOff: 'rgba(15,23,42,0.18)',
    switchKnob: '#FFFFFF',
    /** Dock: capsule fill, its teal edge (also the Customize button's), the divider in it. */
    dock: 'rgba(255,255,255,0.72)',
    accentEdge: 'rgba(45,212,191,0.4)',
    divider: 'rgba(15,23,42,0.12)',
    /** Dashed outline of an empty app slot (empty Home). */
    dashedSlot: 'rgba(15,23,42,0.18)',
    onAccent: '#042F2A',
    danger: '#DC2626',
    /** Group folder (GroupSheet.dc.html): the tint over the blurred Home behind an open folder. */
    folderDim: 'rgba(238,242,245,0.45)',
    /** The same where Home can't be blurred (Android: the folder is its own screen). */
    folderDimSolid: 'rgba(238,242,245,0.92)',
    /** No fill: a screen that shows the one under it (the folder's modal). */
    clear: 'transparent',
    /** Customize Home (Customize.dc.html): group name field, its border (also Hide's). */
    field: 'rgba(255,255,255,0.85)',
    fieldBorder: 'rgba(15,23,42,0.10)',
    /** Quiet icons: up / down chevrons, Cancel. */
    iconMuted: '#64748B',
    /** The action bar for the selected app. */
    bar: 'rgba(255,255,255,0.78)',
    /** Border of a group that offers "Move <app> here". */
    accentTarget: 'rgba(45,212,191,0.53)',
    /** Today: a page dot that is not the current page (the current one is `accent`). */
    dotOff: 'rgba(15,23,42,0.2)',
    heat1: 'rgba(45,212,191,0.30)',
    heat2: 'rgba(45,212,191,0.55)',
    heat3: 'rgba(20,184,166,0.80)',
    heat4: '#0F766E',
  },
  dark: {
    background: '#0A0F1C',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#A3AEC2',
    textQuaternary: '#8B95A7',
    glass: 'rgba(17,26,46,0.52)',
    glassBorder: 'rgba(255,255,255,0.09)',
    control: 'rgba(255,255,255,0.08)',
    controlBorder: 'rgba(255,255,255,0.16)',
    controlGlyph: '#E2E8F0',
    separator: 'rgba(255,255,255,0.08)',
    accent: '#2DD4BF',
    accentText: '#2DD4BF',
    accentFill: 'rgba(45,212,191,0.16)',
    segmentTrack: 'rgba(10,15,28,0.45)',
    segmentSelected: 'rgba(45,212,191,0.18)',
    segmentSelectedBorder: 'rgba(45,212,191,0.55)',
    switchOff: '#334155',
    switchKnob: '#FFFFFF',
    dock: 'rgba(255,255,255,0.08)',
    accentEdge: 'rgba(45,212,191,0.4)',
    divider: 'rgba(255,255,255,0.16)',
    dashedSlot: 'rgba(255,255,255,0.18)',
    onAccent: '#042F2A',
    danger: '#F87171',
    folderDim: 'rgba(3,6,14,0.45)',
    folderDimSolid: 'rgba(10,15,28,0.92)',
    clear: 'transparent',
    field: 'rgba(10,15,28,0.45)',
    fieldBorder: 'rgba(255,255,255,0.12)',
    iconMuted: '#94A3B8',
    bar: 'rgba(19,27,46,0.72)',
    accentTarget: 'rgba(45,212,191,0.53)',
    dotOff: 'rgba(255,255,255,0.25)',
    /** Habits year heatmap: four steps of teal, from a few habits done to all of them. */
    heat1: 'rgba(45,212,191,0.28)',
    heat2: 'rgba(45,212,191,0.50)',
    heat3: 'rgba(45,212,191,0.75)',
    heat4: '#2DD4BF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Gradients and shadows — not colors, so they stay out of `ThemeColor`. Read via `useThemeEffects()`. */
export const Effects = {
  light: {
    /** Five soft radial glows over `background`; fixed, does not scroll. */
    wallpaper:
      'radial-gradient(90% 26% at 0% 0%, rgba(45,212,191,0.32) 0%, rgba(45,212,191,0) 100%), radial-gradient(70% 22% at 100% 22%, rgba(251,191,36,0.24) 0%, rgba(251,191,36,0) 100%), radial-gradient(80% 26% at 0% 52%, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0) 100%), radial-gradient(80% 26% at 100% 74%, rgba(139,92,246,0.16) 0%, rgba(139,92,246,0) 100%), radial-gradient(100% 26% at 40% 100%, rgba(45,212,191,0.24) 0%, rgba(45,212,191,0) 100%)',
    /** Thin top-edge highlight, drawn above the blur. */
    glassHighlight: 'inset 0 1px 0 rgba(255,255,255,0.9)',
    glassShadow: '0 8px 24px rgba(15,23,42,0.08)',
    controlHighlight: 'inset 0 1px 0 rgba(255,255,255,0.9)',
    controlShadow: '0 6px 18px rgba(15,23,42,0.10)',
    /** expo-blur tint: every tint adds a system layer, so use the thinnest; `glass`/`control` carry the color. */
    blurTint: 'systemUltraThinMaterialLight',
    /** App icon tile: tinted, not filled. */
    tile: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)',
    tileShadow: 'inset 0 1px 0 #FFFFFF, 0 3px 10px rgba(15,23,42,0.10)',
    /** Hex alpha appended to an app tint for the tile's 1 px border. */
    tileBorderAlpha: '33',
    /** Hex alpha appended to an app tint for a Today progress ring's track. */
    ringTrackAlpha: '2E',
    switchKnobShadow: '0 2px 6px rgba(0,0,0,0.3)',
    dockHighlight: 'inset 0 1px 0 rgba(255,255,255,0.9)',
    dockShadow: '0 10px 30px rgba(15,23,42,0.15)',
    /** Customize's action bar. */
    barHighlight: 'inset 0 1px 0 #FFFFFF',
    barShadow: '0 10px 30px rgba(15,23,42,0.16)',
    /** Home: content fades under the fixed header and under the Dock. */
    scrimTop:
      'linear-gradient(180deg, rgba(238,242,245,0.78) 0%, rgba(238,242,245,0.6) 70%, rgba(238,242,245,0) 100%)',
    scrimBottom:
      'linear-gradient(0deg, rgba(238,242,245,0.92) 0%, rgba(238,242,245,0.55) 55%, rgba(238,242,245,0) 100%)',
  },
  dark: {
    wallpaper:
      'radial-gradient(90% 26% at 0% 0%, rgba(20,110,100,0.75) 0%, rgba(20,110,100,0) 100%), radial-gradient(70% 22% at 100% 22%, rgba(120,84,30,0.55) 0%, rgba(120,84,30,0) 100%), radial-gradient(80% 26% at 0% 52%, rgba(16,120,110,0.55) 0%, rgba(16,120,110,0) 100%), radial-gradient(80% 26% at 100% 74%, rgba(76,60,160,0.45) 0%, rgba(76,60,160,0) 100%), radial-gradient(100% 26% at 40% 100%, rgba(20,110,100,0.60) 0%, rgba(20,110,100,0) 100%)',
    glassHighlight: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    glassShadow: '0 8px 24px rgba(0,0,0,0.25)',
    controlHighlight: 'inset 0 1px 0 rgba(255,255,255,0.28)',
    controlShadow: '0 6px 18px rgba(0,0,0,0.35)',
    blurTint: 'systemUltraThinMaterialDark',
    tile: 'linear-gradient(180deg, #1D2A47 0%, #111A2E 100%)',
    tileShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 3px 10px rgba(0,0,0,0.45)',
    tileBorderAlpha: '45',
    ringTrackAlpha: '2E',
    switchKnobShadow: '0 2px 6px rgba(0,0,0,0.3)',
    dockHighlight: 'inset 0 1px 0 rgba(255,255,255,0.28)',
    dockShadow: '0 10px 30px rgba(0,0,0,0.5)',
    barHighlight: 'inset 0 1px 0 rgba(255,255,255,0.22)',
    barShadow: '0 10px 30px rgba(0,0,0,0.5)',
    scrimTop:
      'linear-gradient(180deg, rgba(10,15,28,0.70) 0%, rgba(10,15,28,0.55) 70%, rgba(10,15,28,0) 100%)',
    scrimBottom:
      'linear-gradient(0deg, rgba(10,15,28,0.92) 0%, rgba(10,15,28,0.55) 55%, rgba(10,15,28,0) 100%)',
  },
} as const;

/** App colors (icon glyph and tile border): lighter on dark, deeper on light. Never the accent teal. */
export const AppTints = {
  health: { dark: '#FB7185', light: '#E11D48' },
  habits: { dark: '#FBBF24', light: '#B45309' },
  money: { dark: '#34D399', light: '#047857' },
  wallet: { dark: '#60A5FA', light: '#2563EB' },
  invest: { dark: '#7DD3FC', light: '#0369A1' },
  books: { dark: '#FDBA74', light: '#C2410C' },
  drawify: { dark: '#C4B5FD', light: '#6D28D9' },
  music: { dark: '#F9A8D4', light: '#BE185D' },
} as const;

export type AppTint = keyof typeof AppTints;

/**
 * Habits' own colors (Month grid, Year picker, the habit form). A habit stores a `key`; none stored
 * means one of the first eight, from its id. Lighter on dark, deeper on light. Never rename a key.
 */
export const HabitColors = [
  { key: 'teal', dark: '#2DD4BF', light: '#0F766E' },
  { key: 'blue', dark: '#60A5FA', light: '#2563EB' },
  { key: 'amber', dark: '#FBBF24', light: '#B45309' },
  { key: 'rose', dark: '#FB7185', light: '#E11D48' },
  { key: 'violet', dark: '#C4B5FD', light: '#6D28D9' },
  { key: 'sky', dark: '#38BDF8', light: '#0369A1' },
  { key: 'orange', dark: '#FB923C', light: '#C2410C' },
  { key: 'green', dark: '#4ADE80', light: '#15803D' },
  { key: 'pink', dark: '#F9A8D4', light: '#BE185D' },
  { key: 'lime', dark: '#BEF264', light: '#4D7C0F' },
  { key: 'indigo', dark: '#818CF8', light: '#4338CA' },
  { key: 'red', dark: '#F87171', light: '#B91C1C' },
  { key: 'cyan', dark: '#22D3EE', light: '#0E7490' },
  { key: 'fuchsia', dark: '#E879F9', light: '#A21CAF' },
] as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Sizes from the design. 13 · 65 · 13 · 65 · 13 = 169. */
export const Layout = {
  screenMargin: 20,
  /** Between the blocks of a screen: cards, groups, a day's list. */
  sectionGap: Spacing.three,
  /** Between a block's title and its card. */
  labelGap: Spacing.two,
  card: 169,
  /** Card padding = gap between icons in a card. */
  cardPadding: 13,
  gridGapAcross: 12,
  gridGapDown: 14,
  /** Group name sits this far below its card. */
  groupLabelGap: 6,
  minTouch: 44,
  /** Android's minimum touch target (48 dp); design against it when one layout serves both. */
  minTouchAndroid: 48,
  /**
   * Settings list: row height, padding, gap between icon/label/value, icon tile. `controlPadding`
   * surrounds a lone control (segmented) in a group.
   */
  listRow: {
    minHeight: 54,
    paddingHorizontal: 16,
    gap: 12,
    controlPadding: 12,
    icon: { size: 30, radius: 8, glyph: 16 },
    /** Width of the slot before a Habits row's title: an emoji or a to-do's check, so titles line up. */
    leading: 28,
  },
  /** Dragging a Habits row (#60): long press, lifted copy, insertion line, edge auto-scroll. */
  listDrag: {
    longPressMs: 350,
    liftScale: 1.03,
    liftOpacity: 0.95,
    sourceOpacity: 0.35,
    indicator: 3,
    edge: 80,
    scrollStep: 12,
    /** An empty part of the day shown as a drop place while a row is lifted. */
    emptyHeight: 54,
  },
  /** Segmented control (Settings): segment height and radius, track padding and radius. */
  segmented: { height: 38, radius: 19, trackPadding: 3, trackRadius: 22 },
  /** Switch (Settings): track, inner padding, knob. */
  switch: { width: 51, height: 31, padding: 2, knob: 27 },
  /** Home: gap between sections, scrim heights (top = under the header), Dock. */
  home: {
    sectionGap: 22,
    /** The design's header sits 58 from the top of an 844 pt iPhone (47 pt safe area + 11). */
    headerTop: 11,
    scrimTopExtra: 10,
    scrimBottom: 150,
    /** Empty Home: description width, space kept free at the bottom, dashed slot outline. */
    emptyTextMaxWidth: 300,
    emptyBottom: 80,
    slotBorder: 1.5,
  },
  /**
   * Today (Main.dc.html, #33): gaps in the section, the heading's extra inset, widgets (label row,
   * progress ring, the spacer after the last), page dots (bar, current bar, touch area) and the
   * text size from which widgets go full width (LargeText.dc.html).
   */
  today: {
    gap: 10,
    headingInset: 4,
    widgetGap: 10,
    labelGap: 6,
    labelGlyph: 14,
    /** The progress ring at the end of the label row, `done/total` beside it. */
    ring: { size: 20, stroke: 4 },
    /** Between the ring and its count, and between an item's emoji and name. */
    inlineGap: 6,
    /** Between the rows of things still to do. */
    listGap: 4,
    /** A message widget's headline and the line under it. */
    messageGap: 2,
    endSpacer: 8,
    dot: { size: 6, activeWidth: 16, target: { width: 28, height: 20 }, gap: 2, slop: 14 },
    fullWidthAtFontScale: 1.3,
  },
  dock: {
    bottom: 28,
    gap: 12,
    padding: { vertical: 10, end: 10, start: 14 },
    dividerHeight: 32,
    customize: 52,
    glyph: 22,
  },
  /**
   * Group folder (GroupSheet.dc.html): space between title, panel and Edit group; the panel's
   * padding; the app grid (four columns of card icons, fewer on narrow windows); Edit group.
   */
  folder: {
    gap: 20,
    padding: { vertical: 24, horizontal: 20 },
    columns: 4,
    minColumnGap: 12,
    rowGap: 18,
    labelGap: 6,
    edit: { paddingHorizontal: 16, gap: 8, glyph: 18 },
  },
  /**
   * Customize Home (Customize.dc.html): sections, the hint, group rows (name field and 48 pt
   * controls, #31), app tiles (selection ring, pin badge, hidden fade), Move here, New group and the
   * action bar for the selected app.
   */
  customize: {
    sectionGap: 14,
    hintMargin: 4,
    section: { paddingTop: 13, paddingHorizontal: 13, paddingBottom: 16, gap: 13, titleInset: 3 },
    field: { radius: 14, paddingHorizontal: 14 },
    rowGap: 2,
    controlGlyph: 18,
    headingGlyph: 15,
    /** Between the Dock heading's pin and its word. */
    titleGap: 6,
    ring: { width: 3, offset: 2 },
    badge: { size: 22, offset: 6, glyph: 12 },
    hiddenOpacity: 0.55,
    moveHere: { radius: 16, border: 1.5 },
    addGroup: { height: 54, border: 1.5 },
    bar: {
      inset: 16,
      radius: 32,
      padding: { vertical: 8, end: 8, start: 18 },
      gap: 8,
      button: { height: 42, paddingHorizontal: 16 },
      glyph: 16,
      /** Text this much larger than default stacks the name above the buttons. */
      stackAtFontScale: 1.5,
    },
    /** Drag and drop (#48, tokens.md): long press, lifted copy, drop bar, edge auto-scroll. */
    drag: {
      longPressMs: 350,
      liftScale: 1.06,
      liftOpacity: 0.92,
      sourceOpacity: 0.35,
      indicator: 3,
      indicatorGap: 6,
      outlineRadius: 12,
      edge: 80,
      scrollStep: 12,
      settleMs: 150,
      labelGap: 22,
    },
    /** Room under the last section so the action bar never covers it. */
    bottomRoom: 140,
  },
  /** Primary (accent-filled) button; `compact` is the 44 pt Done in Customize's header. */
  button: { height: 50, paddingHorizontal: 26, compact: { height: 44, paddingHorizontal: 22 } },
  /** Round glass button (Settings, Close, Back). */
  control: { size: 44, glyph: 21 },
  icon: {
    card: { size: 65, radius: 17, glyph: 30 },
    dock: { size: 52, radius: 14, glyph: 26 },
    /** The small icons in a group card's fourth spot (2×2 in a 65 tile). */
    mini: { size: 30, radius: 8, glyph: 16 },
  },
  radius: { card: 30, sheet: 38, list: 26, dock: 34 },
} as const;

/** expo-blur intensity matching the design's `blur(22px)` (cards) and `blur(24px)` (controls). */
export const Blur = {
  glass: 40,
  control: 44,
  /** The Dock's `blur(28px)`. */
  dock: 50,
} as const;

export const MaxContentWidth = 800;
