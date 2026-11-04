import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/utils/format-date';

import { TextButton } from './text-button';
import type { Todo } from '../../../domain/todos';

type Props = {
  todos: readonly Todo[];
  onMoveToToday: (id: string) => void;
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
};

/** Open to-dos from earlier days: move one to today, finish it or delete it. */
export function OverdueCard({ todos, onMoveToToday, onDone, onDelete }: Props) {
  const theme = useTheme();
  if (todos.length === 0) return null;

  return (
    <View style={styles.section} testID="habits-overdue">
      <ThemedText type="listHeader" role="heading" style={styles.inset}>
        {`Overdue · ${todos.length}`}
      </ThemedText>
      <GlassSurface kind="glass" radius={Layout.radius.row} style={styles.list}>
        {todos.map((todo, index) => (
          <Fragment key={todo.id}>
            {index > 0 && <View style={[styles.separator, { backgroundColor: theme.separator }]} />}
            <View style={styles.item} testID={`habits-overdue-${todo.id}`}>
              <ThemedText>{todo.title}</ThemedText>
              <ThemedText type="footnote" themeColor="textSecondary">
                {formatDate(todo.date)}
              </ThemedText>
              <View style={styles.actions}>
                <TextButton
                  label="Move to today"
                  accessibilityLabel={`Move to today: ${todo.title}`}
                  onPress={() => onMoveToToday(todo.id)}
                  testID={`habits-overdue-${todo.id}-move`}
                />
                <TextButton
                  label="Done"
                  accessibilityLabel={`Done: ${todo.title}`}
                  onPress={() => onDone(todo.id)}
                  testID={`habits-overdue-${todo.id}-done`}
                />
                <TextButton
                  label="Delete"
                  destructive
                  accessibilityLabel={`Delete to-do: ${todo.title}`}
                  onPress={() => onDelete(todo.id)}
                  testID={`habits-overdue-${todo.id}-delete`}
                />
              </View>
            </View>
          </Fragment>
        ))}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  inset: {
    marginHorizontal: Layout.listRow.paddingHorizontal,
  },
  list: {
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: Layout.listRow.paddingHorizontal,
    paddingTop: Spacing.two,
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    marginStart: -Layout.listRow.paddingHorizontal,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginStart: Layout.listRow.paddingHorizontal,
  },
});
