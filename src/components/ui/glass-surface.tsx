import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useWallpaperTarget } from '@/components/ui/wallpaper';
import { Blur } from '@/constants/theme';
import { useTheme, useThemeEffects } from '@/hooks/use-theme';

type Props = ViewProps & {
  /** `glass` for cards and sheets, `control` for round buttons and the Dock. */
  kind: 'glass' | 'control';
  radius: number;
};

/**
 * The one glass implementation: blur, the token tint, then the border and top-edge highlight drawn
 * above both. Never put `opacity` on it or a parent — iOS can't blur under a faded view; dim the
 * content inside instead. On Android the blur needs a `Wallpaper` ancestor; without one it is the
 * translucent tint alone.
 */
export function GlassSurface({ kind, radius, style, children, ...rest }: Props) {
  const theme = useTheme();
  const effects = useThemeEffects();
  const target = useWallpaperTarget();
  const canBlur = Platform.OS !== 'android' || target !== null;
  const glass = kind === 'glass';
  const round = { borderRadius: radius };

  return (
    <View
      style={[round, { boxShadow: glass ? effects.glassShadow : effects.controlShadow }, style]}
      {...rest}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, round]}>
        {canBlur && (
          <BlurView
            tint={effects.blurTint}
            intensity={glass ? Blur.glass : Blur.control}
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={target ?? undefined}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: glass ? theme.glass : theme.control },
          ]}
        />
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
            borderColor: glass ? theme.glassBorder : theme.controlBorder,
            boxShadow: glass ? effects.glassHighlight : effects.controlHighlight,
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
