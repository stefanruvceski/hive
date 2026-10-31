import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useWallpaperTarget } from '@/components/ui/wallpaper';
import { Blur } from '@/constants/theme';
import { useTheme, useThemeEffects } from '@/hooks/use-theme';

type Kind = 'glass' | 'control' | 'dock';

type Props = ViewProps & {
  /** `glass` for cards and sheets, `control` for round buttons, `dock` for the Dock capsule. */
  kind: Kind;
  radius: number;
};

/** Which tokens each kind of glass uses. */
function useGlassTokens(kind: Kind) {
  const theme = useTheme();
  const effects = useThemeEffects();
  switch (kind) {
    case 'glass':
      return {
        fill: theme.glass,
        border: theme.glassBorder,
        highlight: effects.glassHighlight,
        shadow: effects.glassShadow,
        blur: Blur.glass,
      };
    case 'control':
      return {
        fill: theme.control,
        border: theme.controlBorder,
        highlight: effects.controlHighlight,
        shadow: effects.controlShadow,
        blur: Blur.control,
      };
    case 'dock':
      return {
        fill: theme.dock,
        border: theme.accentEdge,
        highlight: effects.dockHighlight,
        shadow: effects.dockShadow,
        blur: Blur.dock,
      };
  }
}

/**
 * The one glass implementation: blur, the token tint, then the border and top-edge highlight drawn
 * above both. Never put `opacity` on it or a parent — iOS can't blur under a faded view; dim the
 * content inside instead. On Android the blur needs a `Wallpaper` ancestor; without one it is the
 * translucent tint alone.
 */
export function GlassSurface({ kind, radius, style, children, ...rest }: Props) {
  const effects = useThemeEffects();
  const tokens = useGlassTokens(kind);
  const target = useWallpaperTarget();
  const canBlur = Platform.OS !== 'android' || target !== null;
  const round = { borderRadius: radius };

  return (
    <View style={[round, { boxShadow: tokens.shadow }, style]} {...rest}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, round]}>
        {canBlur && (
          <BlurView
            tint={effects.blurTint}
            intensity={tokens.blur}
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={target ?? undefined}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.fill }]} />
      </View>
      {children}
      <View
        pointerEvents="none"
        testID={rest.testID && `${rest.testID}-edge`}
        style={[
          StyleSheet.absoluteFill,
          styles.edge,
          round,
          {
            borderColor: tokens.border,
            boxShadow: tokens.highlight,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  edge: {
    borderWidth: 1,
  },
});
