import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { AppTints, type AppTint, Layout } from '@/constants/theme';
import { useThemeEffects, useThemeName } from '@/hooks/use-theme';

type Props = {
  /** Which app color tints the glyph and border. */
  tint: AppTint;
  /** Per-platform name — a bare SF Symbol string renders nothing on Android (agent-rules/03 §6). */
  icon: Exclude<SymbolViewProps['name'], string>;
  /** `card` (65) in group cards and folders, `dock` (52) in the Dock, `mini` (30) in a card's fourth spot. */
  size?: 'card' | 'dock' | 'mini';
  /** The app's name, read by screen readers. */
  label: string;
  testID: string;
};

/** An app's tile: tinted, not filled — the glyph and a 1 px border carry the app color. */
export function AppIcon({ tint, icon, size = 'card', label, testID }: Props) {
  const scheme = useThemeName();
  const effects = useThemeEffects();
  const color = AppTints[tint][scheme];
  const dims = Layout.icon[size];

  return (
    <View
      accessible
      role="img"
      aria-label={label}
      testID={testID}
      style={[
        styles.tile,
        {
          width: dims.size,
          height: dims.size,
          borderRadius: dims.radius,
          borderColor: color + effects.tileBorderAlpha,
          backgroundImage: effects.tile,
          boxShadow: effects.tileShadow,
        },
      ]}>
      <SymbolView name={icon} size={dims.glyph} tintColor={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
