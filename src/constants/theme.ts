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
    onAccent: '#042F2A',
    danger: '#DC2626',
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
    onAccent: '#042F2A',
    danger: '#F87171',
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
  /** Primary (accent-filled) button. */
  button: { height: 50, paddingHorizontal: 26 },
  /** Round glass button (Settings, Close, Back). */
  control: { size: 44, glyph: 21 },
  icon: {
    card: { size: 65, radius: 17, glyph: 30 },
    dock: { size: 52, radius: 14, glyph: 26 },
  },
  radius: { card: 30, sheet: 38, list: 26, dock: 34 },
} as const;

/** expo-blur intensity matching the design's `blur(22px)` (cards) and `blur(24px)` (controls). */
export const Blur = {
  glass: 40,
  control: 44,
} as const;

export const MaxContentWidth = 800;
