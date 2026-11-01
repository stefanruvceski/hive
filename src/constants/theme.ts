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
    switchKnobShadow: '0 2px 6px rgba(0,0,0,0.3)',
    dockHighlight: 'inset 0 1px 0 rgba(255,255,255,0.9)',
    dockShadow: '0 10px 30px rgba(15,23,42,0.15)',
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
    switchKnobShadow: '0 2px 6px rgba(0,0,0,0.3)',
    dockHighlight: 'inset 0 1px 0 rgba(255,255,255,0.28)',
    dockShadow: '0 10px 30px rgba(0,0,0,0.5)',
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
  /** Primary (accent-filled) button. */
  button: { height: 50, paddingHorizontal: 26 },
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
