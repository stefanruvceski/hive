import { BlurTargetView } from 'expo-blur';
import { createContext, type ComponentRef, type RefObject, use, useRef } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme, useThemeEffects } from '@/hooks/use-theme';

type BlurTarget = RefObject<ComponentRef<typeof View> | null>;

const WallpaperTarget = createContext<BlurTarget | null>(null);

/** The view glass surfaces blur on Android (`blurTarget`); null outside a `Wallpaper`. */
export function useWallpaperTarget() {
  return use(WallpaperTarget);
}

/**
 * The fixed background glow behind a screen. Wrap the whole screen in it: the glow does not scroll,
 * and glass surfaces inside blur it (Android blurs only what is inside a `BlurTargetView`, so the
 * glow sits in one).
 */
export function Wallpaper({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();
  const effects = useThemeEffects();
  const target = useRef<ComponentRef<typeof View>>(null);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]} {...rest}>
      <BlurTargetView
        ref={target}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}>
        {/* Android draws `backgroundImage` only on plain RN views, not on BlurTargetView itself. */}
        <View
          testID="wallpaper-glow"
          style={[StyleSheet.absoluteFill, { backgroundImage: effects.wallpaper }]}
        />
      </BlurTargetView>
      <WallpaperTarget value={target}>{children}</WallpaperTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
