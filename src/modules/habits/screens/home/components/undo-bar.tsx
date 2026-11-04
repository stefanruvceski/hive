import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';

import { TextButton } from './text-button';

/** How long the bar stays before the change is final. */
export const undoMs = 6000;

type Props = {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
};

/** "Habit archived · Undo": a bar at the bottom that goes away by itself. */
export function UndoBar({ message, onUndo, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const timer = setTimeout(onDismiss, undoMs);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + Spacing.three }]} pointerEvents="box-none">
      <GlassSurface kind="bar" radius={Layout.radius.row} style={styles.bar}>
        <ThemedText style={styles.message} role="alert" testID="habits-undo-message">
          {message}
        </ThemedText>
        <TextButton label="Undo" onPress={onUndo} testID="habits-undo" />
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
});
