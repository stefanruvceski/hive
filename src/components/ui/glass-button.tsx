import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Per-platform name — a bare SF Symbol string renders nothing on Android (agent-rules/03 §6). */
  icon: Exclude<SymbolViewProps['name'], string>;
  /** Accessible name; the button has no visible text. */
  label: string;
  onPress?: () => void;
  testID: string;
};

/**
 * Round glass control (Settings, Close, Back), 44 pt. Liquid Glass on iOS 26+, otherwise
 * `GlassSurface`. Pressed feedback fades the glyph only — a faded parent breaks the blur on iOS.
 */
export function GlassButton({ icon, label, onPress, testID }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={label}
      testID={testID}
      onPress={onPress}
      style={styles.button}>
      {({ pressed }) => {
        const glyph = (
          <SymbolView
            name={icon}
            size={Layout.control.glyph}
            tintColor={theme.controlGlyph}
            style={pressed && styles.pressed}
          />
        );
        return isLiquidGlassAvailable() ? (
          <GlassView isInteractive style={[StyleSheet.absoluteFill, styles.center, styles.round]}>
            {glyph}
          </GlassView>
        ) : (
          <GlassSurface
            kind="control"
            radius={Layout.control.size / 2}
            style={[StyleSheet.absoluteFill, styles.center]}>
            {glyph}
          </GlassSurface>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: Layout.control.size,
    height: Layout.control.size,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  round: {
    borderRadius: Layout.control.size / 2,
  },
  pressed: {
    opacity: 0.5,
  },
});
