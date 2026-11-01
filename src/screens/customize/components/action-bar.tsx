import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AppActions } from '@/utils/home-edits';

type Props = {
  name: string;
  actions: AppActions;
  onPin: () => void;
  onUnpin: () => void;
  onHide: () => void;
  onCancel: () => void;
};

const pinLabels = { pin: 'Pin', unpin: 'Unpin', 'dock-full': 'Dock full', unavailable: 'Pin' };

// 42 pt buttons, 8 pt apart: a vertical slop reaches 48 without overlapping (agent-rules/12 §2).
const slop = (Layout.minTouchAndroid - Layout.customize.bar.button.height) / 2;
const hitSlop = { top: slop, bottom: slop };

/**
 * What the selected app can do (Customize.dc.html): Pin / Unpin ("Dock full" when four are pinned),
 * Hide, and Cancel. Drawn, not @expo/ui, to match the design on both platforms (agent-rules/03 §4).
 * At large text sizes the name sits above the buttons instead of beside them.
 */
export function ActionBar({ name, actions, onPin, onUnpin, onHide, onCancel }: Props) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= Layout.customize.bar.stackAtFontScale;
  const pinDisabled = actions.pin === 'dock-full' || actions.pin === 'unavailable';
  const hideDisabled = actions.hide === 'hidden';

  return (
    <GlassSurface
      kind="bar"
      radius={Layout.customize.bar.radius}
      role="toolbar"
      aria-label={`${name} actions`}
      style={[styles.bar, stacked && styles.stacked]}
      testID="customize-actions">
      <ThemedText type="action" style={!stacked && styles.name}>
        {name}
      </ThemedText>
      <View style={styles.buttons}>
        <Pressable
          role="button"
          aria-label={pinLabels[actions.pin]}
          disabled={pinDisabled}
          aria-disabled={pinDisabled}
          hitSlop={hitSlop}
          onPress={actions.pin === 'unpin' ? onUnpin : onPin}
          style={[
            styles.button,
            { borderColor: theme.accentEdge, backgroundColor: theme.accentFill },
          ]}
          testID="customize-pin">
          {({ pressed }) => (
            <ThemedText
              type="pill"
              themeColor="accentText"
              style={(pressed || pinDisabled) && styles.dimmed}>
              {pinLabels[actions.pin]}
            </ThemedText>
          )}
        </Pressable>
        <Pressable
          role="button"
          aria-label={hideDisabled ? 'Hidden' : 'Hide'}
          disabled={hideDisabled}
          aria-disabled={hideDisabled}
          hitSlop={hitSlop}
          onPress={onHide}
          style={[styles.button, { borderColor: theme.fieldBorder }]}
          testID="customize-hide">
          {({ pressed }) => (
            <ThemedText type="pillRegular" style={(pressed || hideDisabled) && styles.dimmed}>
              {hideDisabled ? 'Hidden' : 'Hide'}
            </ThemedText>
          )}
        </Pressable>
        <Pressable
          role="button"
          aria-label="Cancel selection"
          hitSlop={hitSlop}
          onPress={onCancel}
          style={styles.cancel}
          testID="customize-cancel">
          {({ pressed }) => (
            <View style={pressed && styles.dimmed}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={Layout.customize.bar.glyph}
                tintColor={theme.iconMuted}
              />
            </View>
          )}
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.customize.bar.gap,
    paddingVertical: Layout.customize.bar.padding.vertical,
    paddingStart: Layout.customize.bar.padding.start,
    paddingEnd: Layout.customize.bar.padding.end,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  name: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  dimmed: {
    opacity: 0.45,
  },
});
