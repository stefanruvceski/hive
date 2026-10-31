import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassCard } from '@/components/ui/glass-card';
import { LoadingState } from '@/components/ui/loading-state';
import { Wallpaper } from '@/components/ui/wallpaper';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type HiveModule, hiveModules } from '@/modules/registry';

import { arrangeModules, type HomeCard, moveCard, toggleHidden, toLayoutRows } from './home-layout';
import { useHomeLayout, useSaveHomeLayout } from './use-home-layout';

/** Hive's launcher: one card per module, in the user's order, with an edit mode. */
export function Home() {
  const [editing, setEditing] = useState(false);

  return (
    <Wallpaper style={styles.container}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title" testID="home-title">
            Hive
          </ThemedText>
          <View style={styles.headerActions}>
            {hiveModules.length > 0 && (
              <Pressable
                role="button"
                testID="home-edit"
                hitSlop={12}
                onPress={() => setEditing((value) => !value)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText themeColor="accentText">{editing ? 'Done' : 'Edit'}</ThemedText>
              </Pressable>
            )}
            <Link href="/settings" asChild>
              <Pressable
                role="button"
                aria-label="Settings"
                testID="home-settings"
                hitSlop={12}
                style={({ pressed }) => pressed && styles.pressed}>
                <HeaderIcon />
              </Pressable>
            </Link>
          </View>
        </View>
        <HomeContent editing={editing} />
      </SafeAreaView>
    </Wallpaper>
  );
}

function HeaderIcon() {
  const theme = useTheme();
  return (
    <SymbolView
      name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
      size={22}
      tintColor={theme.text}
    />
  );
}

// Four states, data first (07 §1). Layout rows are local, so "error" means the database failed.
function HomeContent({ editing }: { editing: boolean }) {
  const { data, error, isError, refetch } = useHomeLayout();
  const save = useSaveHomeLayout();
  const { width } = useWindowDimensions();

  if (hiveModules.length === 0) {
    return (
      <EmptyState
        title="No modules yet"
        description="Modules show up here as they are added."
        testID="home-empty"
      />
    );
  }
  if (data) {
    const cards = arrangeModules(hiveModules, data);
    const shown = editing ? cards : cards.filter((card) => !card.hidden);
    const columns = width >= 600 ? 3 : 2;
    const update = (next: HomeCard<HiveModule>[]) => save.mutate(toLayoutRows(next));

    if (shown.length === 0) {
      return (
        <EmptyState
          title="All modules are hidden"
          description="Tap Edit to show them again."
          testID="home-all-hidden"
        />
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.grid}>
        {shown.map((card) => {
          const index = cards.indexOf(card);
          return (
            <ModuleCard
              key={card.module.id}
              card={card}
              editing={editing}
              basis={`${100 / columns - 2}%`}
              isFirst={index === 0}
              isLast={index === cards.length - 1}
              onMove={(step) => update(moveCard(cards, index, step))}
              onToggleHidden={() => update(toggleHidden(cards, index))}
            />
          );
        })}
        {save.isError && (
          <ThemedText themeColor="textSecondary" testID="home-save-error">
            Couldn&apos;t save the new layout. Please try again.
          </ThemedText>
        )}
      </ScrollView>
    );
  }
  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} testID="home-error" />;
  }
  return <LoadingState testID="home-loading" />;
}

type ModuleCardProps = {
  card: HomeCard<HiveModule>;
  editing: boolean;
  basis: `${number}%`;
  isFirst: boolean;
  isLast: boolean;
  onMove: (step: -1 | 1) => void;
  onToggleHidden: () => void;
};

function ModuleCard({
  card,
  editing,
  basis,
  isFirst,
  isLast,
  onMove,
  onToggleHidden,
}: ModuleCardProps) {
  const theme = useTheme();
  const { module, hidden } = card;
  // Dim the content, never the GlassCard: iOS can't blur under a faded view.
  const body = (dimmed: boolean) => (
    <GlassCard style={styles.card} testID={`home-card-${module.id}`}>
      <View style={[styles.cardContent, dimmed && styles.dimmed]}>
        <SymbolView name={module.icon} size={28} tintColor={theme.text} />
        <ThemedText type="headline">{module.title}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" numberOfLines={2}>
          {module.description}
        </ThemedText>
      </View>
    </GlassCard>
  );

  if (!editing) {
    return (
      <Link href={module.href} asChild>
        <Pressable role="button" testID={`home-open-${module.id}`} style={{ flexBasis: basis }}>
          {({ pressed }) => body(pressed || hidden)}
        </Pressable>
      </Link>
    );
  }

  return (
    <View style={{ flexBasis: basis }}>
      {body(hidden)}
      <View style={styles.editRow}>
        <EditButton
          label={`Move ${module.title} up`}
          testID={`home-up-${module.id}`}
          icon={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
          disabled={isFirst}
          onPress={() => onMove(-1)}
        />
        <EditButton
          label={`Move ${module.title} down`}
          testID={`home-down-${module.id}`}
          icon={{ ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' }}
          disabled={isLast}
          onPress={() => onMove(1)}
        />
        <EditButton
          label={hidden ? `Show ${module.title}` : `Hide ${module.title}`}
          testID={`home-toggle-${module.id}`}
          icon={
            hidden
              ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
              : { ios: 'eye', android: 'visibility', web: 'visibility' }
          }
          onPress={onToggleHidden}
        />
      </View>
    </View>
  );
}

type EditButtonProps = {
  label: string;
  testID: string;
  icon: Exclude<HiveModule['icon'], string>;
  disabled?: boolean;
  onPress: () => void;
};

function EditButton({ label, testID, icon, disabled = false, onPress }: EditButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      testID={testID}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.editButton, (pressed || disabled) && styles.pressed]}>
      <SymbolView name={icon} size={18} tintColor={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  card: {
    padding: Spacing.three,
    minHeight: Spacing.six * 2,
  },
  cardContent: {
    gap: Spacing.two,
  },
  dimmed: {
    opacity: 0.5,
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.two,
  },
  editButton: {
    padding: Spacing.two,
  },
  pressed: {
    opacity: 0.5,
  },
});
