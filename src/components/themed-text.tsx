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
  | 'stateTitle'
  | 'stateBody'
  | 'button'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

const defaultColor: Partial<Record<TextType, ThemeColor>> = {
  date: 'textTertiary',
  groupLabel: 'textQuaternary',
  stateBody: 'textTertiary',
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
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 13,
  },
});
