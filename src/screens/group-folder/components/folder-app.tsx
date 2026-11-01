import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { Layout } from '@/constants/theme';
import type { HiveModule } from '@/modules/registry';

type Props = { app: HiveModule; onOpen: (app: HiveModule) => void };

/** One app in an open group folder: its icon with the name under it. A tap opens the app. */
export function FolderApp({ app, onOpen }: Props) {
  return (
    <Pressable
      role="button"
      aria-label={`Open ${app.title}`}
      onPress={() => onOpen(app)}
      style={styles.app}
      testID={`group-open-${app.id}`}>
      {({ pressed }) => (
        <View style={[styles.content, pressed && styles.pressed]}>
          <AppIcon
            tint={app.tint}
            icon={app.icon}
            label={app.title}
            testID={`group-folder-icon-${app.id}`}
          />
          {/* Wraps under the icon at large text sizes; never cut off. */}
          <ThemedText type="tileLabel" style={styles.label}>
            {app.title}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    width: Layout.icon.card.size,
  },
  content: {
    alignItems: 'center',
    gap: Layout.folder.labelGap,
  },
  label: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
