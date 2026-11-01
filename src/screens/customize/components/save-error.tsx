import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { onRetry: () => void; onDismiss: () => void };

const slop = (Layout.minTouchAndroid - Layout.customize.bar.button.height) / 2;
const hitSlop = { top: slop, bottom: slop };

/**
 * A save that failed and was rolled back (#31). Not in the design; built from the action bar's
 * parts (checkpoint A). Announced when it appears; the icon and text say it, not color alone.
 */
export function SaveError({ onRetry, onDismiss }: Props) {
  const theme = useTheme();

  return (
    <GlassSurface
      kind="bar"
      radius={Layout.customize.bar.radius}
      role="alert"
      aria-live="polite"
      accessibilityLiveRegion="polite"
      style={styles.bar}
      testID="customize-save-error">
      <View style={styles.message}>
        <SymbolView
          name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
          size={Layout.customize.bar.glyph}
          tintColor={theme.danger}
        />
        <ThemedText type="pillRegular" style={styles.text}>
          {"Couldn't save that change."}
        </ThemedText>
      </View>
      <View style={styles.buttons}>
        <Pressable
          role="button"
          aria-label="Try again"
          hitSlop={hitSlop}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            { borderColor: theme.accentEdge, backgroundColor: theme.accentFill },
            pressed && styles.pressed,
          ]}
          testID="customize-save-retry">
          <ThemedText type="pill" themeColor="accentText">
            Try again
          </ThemedText>
        </Pressable>
        <Pressable
          role="button"
          aria-label="Dismiss"
          hitSlop={hitSlop}
          onPress={onDismiss}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          testID="customize-save-dismiss">
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={Layout.customize.bar.glyph}
            tintColor={theme.iconMuted}
          />
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Layout.customize.bar.gap,
    paddingVertical: Layout.customize.bar.padding.vertical,
    paddingStart: Layout.customize.bar.padding.start,
    paddingEnd: Layout.customize.bar.padding.end,
  },
  message: {
    flex: 1,
    minWidth: Layout.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.customize.bar.gap,
  },
  text: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.customize.bar.gap,
  },
  button: {
    minHeight: Layout.customize.bar.button.height,
    paddingHorizontal: Layout.customize.bar.button.paddingHorizontal,
    borderRadius: Layout.customize.bar.button.height / 2,
    borderWidth: 1,
    justifyContent: 'center',
  },
  cancel: {
    width: Layout.customize.bar.button.height,
    height: Layout.customize.bar.button.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
