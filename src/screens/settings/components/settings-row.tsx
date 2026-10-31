import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** From ~1.5× text a side-by-side value is too narrow; it stacks under the label (as `KeyValueRow`). */
const STACK_FONT_SCALE = 1.5;

type Props = {
  label: string;
  /** Teal icon tile before the label. Per-platform name (agent-rules/03 §6). */
  icon?: Exclude<SymbolViewProps['name'], string>;
  /** Value after the label. Wraps; a `code` value stays on one line, cut in the middle. */
  value?: string;
  /** `code` for hashes and ids (monospace, one line). */
  valueType?: 'row' | 'code';
  /** A control at the end of the row (switch). */
  trailing?: ReactNode;
  /** Label as a teal action ("Back Up Now") instead of plain text. */
  action?: boolean;
  /** Shown but not usable yet; content is dimmed, never the glass behind it. */
  disabled?: boolean;
  /** On the value text when there is one (what tests assert), else on the row. */
  testID: string;
};

/**
 * One Settings list row: optional icon tile, label, value or control, 54 pt high. The value sits
 * at the end of the row and stacks under the label at accessibility text sizes. Not pressable yet:
 * no row opens anything until Customize Home (#31) and Backup land.
 */
export function SettingsRow({
  label,
  icon,
  value,
  valueType = 'row',
  trailing,
  action = false,
  disabled = false,
  testID,
}: Props) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= STACK_FONT_SCALE;

  return (
    <View
      style={styles.row}
      testID={value === undefined ? testID : `${testID}-row`}
      aria-disabled={disabled || undefined}
      accessible={disabled || undefined}>
      <View style={[styles.content, disabled && styles.disabled]}>
        {icon && (
          <View style={[styles.tile, { backgroundColor: theme.accentFill }]}>
            <SymbolView name={icon} size={Layout.listRow.icon.glyph} tintColor={theme.accentText} />
          </View>
        )}
        <View style={stacked ? styles.textStacked : styles.text}>
          <ThemedText
            themeColor={action ? 'accentText' : 'text'}
            style={value !== undefined && !stacked && styles.labelBesideValue}>
            {label}
          </ThemedText>
          {value !== undefined && (
            <ThemedText
              type={valueType}
              themeColor="textTertiary"
              // Identifiers can't wrap usefully: one line, cut in the middle so both ends stay.
              numberOfLines={valueType === 'code' ? 1 : undefined}
              ellipsizeMode="middle"
              style={!stacked && styles.valueAtEnd}
              testID={testID}>
              {value}
            </ThemedText>
          )}
        </View>
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
    paddingVertical: Spacing.two,
  },
  tile: {
    width: Layout.listRow.icon.size,
    height: Layout.listRow.icon.size,
    borderRadius: Layout.listRow.icon.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
  },
  textStacked: {
    flex: 1,
    gap: Spacing.half,
  },
  // A short label keeps its width so the value, not the label, gives way (agent-rules/03 §2).
  labelBesideValue: {
    flexShrink: 0,
  },
  // Pushed to the row's end with a logical margin (no left/right, agent-rules/04).
  valueAtEnd: {
    marginStart: 'auto',
  },
  disabled: {
    opacity: 0.45,
  },
});
