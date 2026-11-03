import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout, Spacing } from '@/constants/theme';

import { HabitCheck } from './habit-check';
import { type Suggestion, starterSuggestions } from '../../../domain/suggestions';

type Props = {
  /** The chosen suggestions' ids; the button waits for it to finish. */
  onAdd: (ids: ReadonlySet<string>) => Promise<void> | void;
};

/** Ready-made habits to pick from on the first open: tick a few, add them in one tap. */
export function StarterSuggestions({ onAdd }: Props) {
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <View style={styles.container} testID="habits-suggestions">
      <ThemedText type="headline" role="heading">
        Or start with a few
      </ThemedText>
      <GlassSurface kind="glass" radius={Layout.radius.list} style={styles.card}>
        {starterSuggestions.map((item: Suggestion) => (
          <Pressable
            key={item.id}
            role="button"
            aria-label={item.name}
            onPress={() => toggle(item.id)}
            testID={`habits-suggestion-${item.id}`}
            style={styles.row}>
            <ThemedText aria-hidden>{item.emoji}</ThemedText>
            <ThemedText style={styles.name}>{item.name}</ThemedText>
            <HabitCheck
              checked={chosen.has(item.id)}
              label={`Add ${item.name}`}
              onPress={() => toggle(item.id)}
              testID={`habits-suggestion-check-${item.id}`}
            />
          </Pressable>
        ))}
      </GlassSurface>
      <PrimaryButton
        label={chosen.size > 0 ? `Add ${chosen.size} selected` : 'Pick some to add'}
        disabled={busy || chosen.size === 0}
        onPress={() => {
          setBusy(true);
          void Promise.resolve(onAdd(chosen)).finally(() => setBusy(false));
        }}
        testID="habits-suggestions-add"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: Spacing.three },
  card: { paddingHorizontal: Layout.listRow.paddingHorizontal },
  row: {
    minHeight: Layout.minTouchAndroid,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  name: { flex: 1 },
});
