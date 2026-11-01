import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HiveModule } from '@/modules/registry';

type Props = {
  pinned: readonly HiveModule[];
  /** Distance from the screen bottom. */
  bottom: number;
  onOpen: (app: HiveModule) => void;
};

/**
 * The Dock: pinned apps (one tap opens them), a divider and the Customize button (Main.dc.html).
 * Customize opens with #31; until then it is shown dimmed and does nothing.
 */
export function Dock({ pinned, bottom, onOpen }: Props) {
  const theme = useTheme();

  return (
    <View pointerEvents="box-none" style={[styles.anchor, { bottom }]}>
      <GlassSurface
        kind="dock"
        radius={Layout.radius.dock}
        role="toolbar"
        aria-label="Pinned apps"
        style={styles.dock}
        testID="home-dock">
        {pinned.map((app) => (
          <Pressable
            key={app.id}
            role="button"
            aria-label={`Open ${app.title}`}
            onPress={() => onOpen(app)}
            testID={`home-dock-${app.id}`}>
            {({ pressed }) => (
              <View style={pressed && styles.pressed}>
                <AppIcon
                  tint={app.tint}
                  icon={app.icon}
                  size="dock"
                  label={app.title}
                  testID={`home-dock-${app.id}-icon`}
                />
              </View>
            )}
          </Pressable>
        ))}
        {pinned.length > 0 && <View style={[styles.divider, { backgroundColor: theme.divider }]} />}
        <View
          accessible
          role="button"
          aria-label="Customize Home"
          aria-disabled
          testID="home-customize"
          style={[
            styles.customize,
            { backgroundColor: theme.accentFill, borderColor: theme.accentEdge },
          ]}>
          <View style={styles.dimmed}>
            <SymbolView
              name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
              size={Layout.dock.glyph}
              tintColor={theme.accentText}
            />
          </View>
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    start: 0,
    end: 0,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.dock.gap,
    paddingVertical: Layout.dock.padding.vertical,
    paddingStart: Layout.dock.padding.start,
    paddingEnd: Layout.dock.padding.end,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: Layout.dock.dividerHeight,
  },
  customize: {
    width: Layout.dock.customize,
    height: Layout.dock.customize,
    borderRadius: Layout.dock.customize / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  dimmed: {
    opacity: 0.45,
  },
});
