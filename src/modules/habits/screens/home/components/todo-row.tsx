import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { Todo } from '../../../domain/todos';

const BOX = 30;
// A habit's circle (habit-check.tsx): the square sits in the same width, so the centers line up.
const CIRCLE = 34;

type Props = {
  todo: Todo;
  onToggle: (done: boolean) => void;
  /** Screen-reader alternatives to the swipe buttons. */
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

/**
 * A one-off to-do, laid out like a habit's row so a list reads as one: an icon, the title, and the
 * "done" check at the end: square where a habit's is round. Star, Edit and Delete are swipe buttons.
 */
export function TodoRow({ todo, onToggle, onEdit, onDelete, onMoveUp, onMoveDown }: Props) {
  const theme = useTheme();
  const actions = [
    ...(onEdit ? [{ name: 'edit', label: 'Edit' }] : []),
    ...(onDelete ? [{ name: 'delete', label: 'Delete' }] : []),
    ...(onMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
    ...(onMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
  ];

  return (
    <View style={styles.row} testID={`habits-todo-${todo.id}`}>
      <View style={styles.icon} aria-hidden>
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={Layout.control.glyph}
          tintColor={theme.accentText}
        />
      </View>
      <View
        style={styles.text}
        accessible={actions.length > 0}
        accessibilityActions={actions}
        onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName;
          if (name === 'edit') onEdit?.();
          else if (name === 'delete') onDelete?.();
          else if (name === 'moveUp') onMoveUp?.();
          else if (name === 'moveDown') onMoveDown?.();
        }}
        testID={`habits-todo-text-${todo.id}`}>
        <ThemedText
          themeColor={todo.done ? 'textSecondary' : 'text'}
          style={todo.done && styles.done}>
          {todo.title}
        </ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary">
          To-do
        </ThemedText>
      </View>
      <Pressable
        role="checkbox"
        aria-checked={todo.done}
        aria-label={`To-do: ${todo.title}`}
        hitSlop={7}
        onPress={() => onToggle(!todo.done)}
        testID={`habits-todo-${todo.id}-check`}
        style={({ pressed }) => [styles.touch, pressed && styles.pressed]}>
        <View
          style={[
            styles.box,
            todo.done
              ? { backgroundColor: theme.accent, borderColor: theme.accent }
              : { backgroundColor: theme.control, borderColor: theme.accent, borderWidth: 2 },
          ]}>
          {todo.done && (
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              size={Layout.control.glyph - 4}
              tintColor={theme.onAccent}
            />
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: Layout.listRow.minHeight,
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.listRow.gap,
  },
  // The same slot as a habit's emoji, so the titles line up.
  icon: {
    width: Layout.listRow.leading,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  done: {
    textDecorationLine: 'line-through',
  },
  touch: {
    width: CIRCLE,
    height: CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: Spacing.one + Spacing.half,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
