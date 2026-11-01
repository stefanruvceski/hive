import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Type scale from docs/design/tokens.md on the system font. Sizes scale with the system text size;
// never cap them (agent-rules/12 §3).
type TextType =
  | 'date'
  | 'title'
  | 'section'
  | 'headline'
  | 'number'
  | 'body'
  | 'groupLabel'
  | 'row'
  | 'listHeader'
  | 'footnote'
  | 'segment'
  | 'segmentSelected'
  | 'stateTitle'
  | 'stateBody'
  | 'button'
  | 'tileLabel'
  | 'code'
  | 'rowCode'
  | 'hint'
  | 'action'
  | 'pill'
  | 'pillRegular';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

const defaultColor: Partial<Record<TextType, ThemeColor>> = {
  date: 'textTertiary',
  groupLabel: 'textQuaternary',
  stateBody: 'textTertiary',
  listHeader: 'textQuaternary',
  footnote: 'textQuaternary',
  tileLabel: 'textSecondary',
  hint: 'textTertiary',
};

export function ThemedText({ style, type = 'row', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = theme[themeColor ?? defaultColor[type] ?? 'text'];

  return <Text style={[styles.base, { color }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  // RN Text defaults to flexShrink: 0, which lets text in a row overflow its parent.
  base: {
    flexShrink: 1,
    fontFamily: Fonts.sans,
  },
  /** Date line above the screen title. */
  date: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  /** Screen title. */
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
  },
  /** Section title ("Today"). */
  section: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 600,
  },
  /** Widget headline. */
  headline: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 700,
  },
  /** Widget big number. */
  number: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: 700,
  },
  /** Body text and labels in cards. */
  body: {
    fontSize: 13,
  },
  /** Group name under a card. */
  groupLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: 500,
    letterSpacing: 0.1,
  },
  /** List rows (Settings, sheets). */
  row: {
    fontSize: 17,
  },
  /** Header above a Settings list group. */
  listHeader: {
    fontSize: 15,
    fontWeight: 600,
  },
  /** Explanation under a Settings list group. */
  footnote: {
    fontSize: 13,
    lineHeight: 18,
  },
  /** Segmented control option, and the chosen one. */
  segment: {
    fontSize: 15,
  },
  segmentSelected: {
    fontSize: 15,
    fontWeight: 600,
  },
  /** Empty-state title (docs/design/canvas/Empty.dc.html). */
  stateTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  /** Empty-state description. */
  stateBody: {
    fontSize: 15,
    lineHeight: 21,
  },
  /** Primary button label. */
  button: {
    fontSize: 16,
    fontWeight: 600,
  },
  /** An app's name under its icon (group folder). */
  tileLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: 500,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 13,
  },
  /** Hash or id as a list-row value (Settings → About). */
  rowCode: {
    fontFamily: Fonts.mono,
    fontSize: 15,
  },
  /** Explanation under a screen title (Customize Home). */
  hint: {
    fontSize: 14,
    lineHeight: 19,
  },
  /** Outlined or dashed action ("Move Habits here", "+ New group"). */
  action: {
    fontSize: 15,
    fontWeight: 600,
  },
  /** Pill button in an action bar (Pin), and its quieter sibling (Hide). */
  pill: {
    fontSize: 14,
    fontWeight: 600,
  },
  pillRegular: {
    fontSize: 14,
  },
});
