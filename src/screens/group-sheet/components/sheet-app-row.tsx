import { SymbolView } from 'expo-symbols';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HiveModule } from '@/modules/registry';

type Props = {
  app: HiveModule;
  /** The first row has no divider above it. */
  first: boolean;
  onOpen: (app: HiveModule) => void;
};

/**
 * One app in the group sheet: icon, name, its one-line description and a chevron. The whole row
 * opens the app. Without a description the name stands alone.
 */
export function SheetAppRow({ app, first, onOpen }: Props) {
  const theme = useTheme();
  const about = app.description.trim();

  return (
    <Pressable
      role="button"
      aria-label={about ? `${app.title}, ${about}` : app.title}
      onPress={() => onOpen(app)}
      android_ripple={{ color: theme.separator }}
      testID={`home-open-${app.id}`}
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator },
      ]}>
      {({ pressed }) => (
        <View style={[styles.content, pressed && styles.pressed]}>
          <AppIcon
            tint={app.tint}
            icon={app.icon}
            size="dock"
            label={app.title}
            testID={`group-sheet-icon-${app.id}`}
          />
          <View style={styles.text}>
            <ThemedText type="rowTitle" testID={`group-sheet-name-${app.id}`}>
              {app.title}
            </ThemedText>
            {about ? (
              <ThemedText
                type="body"
                themeColor="textQuaternary"
                testID={`group-sheet-about-${app.id}`}>
                {about}
              </ThemedText>
            ) : null}
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={Layout.sheet.row.chevron}
            tintColor={theme.chevron}
            style={I18nManager.isRTL && styles.flip}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: Layout.sheet.row.minHeight,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.sheet.row.gap,
    paddingHorizontal: Layout.sheet.row.padding,
    paddingVertical: Spacing.two,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
  // The chevron points to the trailing edge (agent-rules/04 §11).
  flip: {
    transform: [{ scaleX: -1 }],
  },
});
