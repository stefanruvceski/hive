import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HiveModule } from '@/modules/registry';

type Props = {
  app: HiveModule;
  /** What a screen reader says: the name, plus "pinned", "in the Dock" or "hidden" where it applies. */
  label: string;
  selected: boolean;
  /** Shows the pin badge (an app in a group that is also in the Dock). */
  pinned?: boolean;
  /** Hidden apps are drawn faded. */
  faded?: boolean;
  onPress: () => void;
  testID: string;
};

const ringInset = -(Layout.customize.ring.offset + Layout.customize.ring.width);

/** An app tile in Customize: tap to select it (teal ring), again to let go. */
export function SelectableApp({ app, label, selected, pinned, faded, onPress, testID }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-selected={selected}
      onPress={onPress}
      style={styles.tile}
      testID={testID}>
      {({ pressed }) => (
        <>
          <View
            pointerEvents="none"
            style={[styles.ring, { borderColor: selected ? theme.accent : theme.clear }]}
          />
          <View style={[faded && styles.faded, pressed && styles.pressed]}>
            <AppIcon tint={app.tint} icon={app.icon} label={app.title} testID={`${testID}-icon`} />
          </View>
          {pinned && (
            <View aria-hidden style={[styles.badge, { backgroundColor: theme.accent }]}>
              <SymbolView
                name={{ ios: 'pin.fill', android: 'push_pin', web: 'push_pin' }}
                size={Layout.customize.badge.glyph}
                tintColor={theme.onAccent}
              />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: Layout.icon.card.size,
    height: Layout.icon.card.size,
  },
  ring: {
    position: 'absolute',
    top: ringInset,
    bottom: ringInset,
    start: ringInset,
    end: ringInset,
    borderWidth: Layout.customize.ring.width,
    borderRadius: Layout.icon.card.radius - ringInset,
  },
  badge: {
    position: 'absolute',
    top: -Layout.customize.badge.offset,
    end: -Layout.customize.badge.offset,
    width: Layout.customize.badge.size,
    height: Layout.customize.badge.size,
    borderRadius: Layout.customize.badge.size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faded: {
    opacity: Layout.customize.hiddenOpacity,
  },
  pressed: {
    opacity: 0.6,
  },
});
