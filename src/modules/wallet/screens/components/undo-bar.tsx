import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';

/** How long the bar stays before the delete is final. */
export const undoMs = 6000;

type Props = { message: string; onUndo: () => void; onDismiss: () => void };

/** "Card deleted · Undo": a bar at the bottom that goes away by itself. */
export function UndoBar({ message, onUndo, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const timer = setTimeout(onDismiss, undoMs);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + Spacing.three }]} pointerEvents="box-none">
      <GlassSurface kind="bar" radius={Layout.radius.list} style={styles.bar}>
        <ThemedText style={styles.message} role="alert" testID="wallet-undo-message">
          {message}
        </ThemedText>
        <Pressable
          role="button"
          aria-label="Undo"
          testID="wallet-undo"
          onPress={onUndo}
          hitSlop={8}
          style={styles.action}>
          <ThemedText themeColor="accentText">Undo</ThemedText>
        </Pressable>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: Spacing.three },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Layout.listRow.paddingHorizontal,
  },
  message: { flex: 1 },
  action: {
    minHeight: Layout.minTouch,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
});
