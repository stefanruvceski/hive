import { router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useEditHome, useHomeLayout } from '@/hooks/use-home-layout';
import { useTheme } from '@/hooks/use-theme';
import { defaultHomeGroups, hiveModules } from '@/modules/registry';
import { appActions, customizeView, type HomeEdit, NEW_GROUP_NAME } from '@/utils/home-edits';
import type { HomeRows } from '@/utils/home-groups';

import { ActionBar } from './components/action-bar';
import { CustomizeHeader } from './components/customize-header';
import { DockSlots } from './components/dock-slots';
import { GroupSection } from './components/group-section';
import { HiddenSection } from './components/hidden-section';
import { SaveError } from './components/save-error';

type Props = {
  /** A group to scroll to on open ("Edit group" in a folder). Unknown ids are ignored. */
  focusGroup?: string;
};

/**
 * Customize Home (docs/design/canvas/Customize.dc.html): the Dock, every group (rename, reorder,
 * add, delete when empty), and hidden apps. Tap an app to pin, hide or move it. Every change is
 * saved at once and rolls back if the save fails (#31); Done closes.
 */
export function Customize({ focusGroup }: Props) {
  const insets = useSafeAreaInsets();
  const { data, error, isError, refetch } = useHomeLayout();
  const close = () => router.back();
  const top = { paddingTop: insets.top + Layout.home.headerTop };

  // Four states, data first (07 §1). The layout is local, so "error" means the database failed.
  if (data) {
    return (
      <Wallpaper style={styles.container} testID="customize">
        <CustomizeContent rows={data} focusGroup={focusGroup} onDone={close} />
      </Wallpaper>
    );
  }
  return (
    <Wallpaper style={styles.container} testID="customize">
      <View style={[styles.container, styles.content, styles.padded, styles.centered, top]}>
        <CustomizeHeader onDone={close} />
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} testID="customize-error" />
        ) : (
          <LoadingState testID="customize-loading" />
        )}
      </View>
    </Wallpaper>
  );
}

type ContentProps = { rows: HomeRows; focusGroup?: string; onDone: () => void };

function CustomizeContent({ rows, focusGroup, onDone }: ContentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const edit = useEditHome(hiveModules, defaultHomeGroups);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);

  const view = customizeView(hiveModules, rows, defaultHomeGroups);
  // The selection is gone once its app is (e.g. a module removed while Customize was open).
  const selected =
    [...view.pinned, ...view.hidden, ...view.groups.flatMap((g) => g.apps.map((a) => a.app))].find(
      (app) => app.id === selectedId,
    ) ?? null;
  const actions = selected ? appActions(view, selected.id) : null;

  const send = (change: HomeEdit) => {
    setSelectedId(null);
    edit.mutate(change);
  };
  const select = (id: string) => setSelectedId((current) => (current === id ? null : id));
  const addGroup = () =>
    send({ kind: 'add-group', groupId: `group-${Date.now().toString(36)}`, name: NEW_GROUP_NAME });

  const bottom = Math.max(insets.bottom, Layout.dock.bottom);

  return (
    <>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.page,
          {
            paddingTop: insets.top + Layout.home.headerTop,
            paddingBottom: bottom + Layout.customize.bottomRoom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        testID="customize-scroll">
        <View style={[styles.content, styles.padded]}>
          <CustomizeHeader onDone={onDone} />
          <ThemedText type="hint" style={styles.hint}>
            {
              "Tap an app to pin it, move it to another group or hide it. Tap a group's name to rename it."
            }
          </ThemedText>
          <DockSlots pinned={view.pinned} selectedId={selectedId} onSelect={select} />
          {view.groups.map((group, index) => (
            <GroupSection
              key={group.id}
              group={group}
              canMoveUp={index > 0}
              canMoveDown={index < view.groups.length - 1}
              canDelete={group.apps.length === 0 && view.groups.length > 1}
              selectedId={selectedId}
              moveHereName={
                selected && actions?.moveTargets.includes(group.id) ? selected.title : null
              }
              onSelect={select}
              onEdit={send}
              onLayout={(event) => {
                if (group.id !== focusGroup || scrolled.current) return;
                scrolled.current = true;
                scroll.current?.scrollTo({
                  y: Math.max(0, event.nativeEvent.layout.y - Spacing.three),
                  animated: false,
                });
              }}
            />
          ))}
          <Pressable
            role="button"
            aria-label="New group"
            onPress={addGroup}
            style={({ pressed }) => [
              styles.addGroup,
              { borderColor: theme.dashedSlot },
              pressed && styles.pressed,
            ]}
            testID="customize-add-group">
            <ThemedText type="action" themeColor="textSecondary" style={styles.center}>
              + New group
            </ThemedText>
          </Pressable>
          <HiddenSection hidden={view.hidden} selectedId={selectedId} onSelect={select} />
        </View>
      </ScrollView>
      <View pointerEvents="box-none" style={[styles.bottom, { bottom }]}>
        {edit.isError && edit.variables && (
          <SaveError
            onRetry={() => {
              if (edit.variables) edit.mutate(edit.variables);
            }}
            onDismiss={() => edit.reset()}
          />
        )}
        {selected && actions && (
          <ActionBar
            name={selected.title}
            actions={actions}
            onPin={() => send({ kind: 'pin', moduleId: selected.id })}
            onUnpin={() => send({ kind: 'unpin', moduleId: selected.id })}
            onHide={() => send({ kind: 'hide', moduleId: selected.id })}
            onCancel={() => setSelectedId(null)}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Layout.customize.sectionGap,
  },
  padded: {
    paddingHorizontal: Layout.screenMargin,
  },
  centered: {
    alignSelf: 'center',
  },
  hint: {
    marginHorizontal: Layout.customize.hintMargin,
    marginBottom: Layout.customize.hintMargin,
  },
  addGroup: {
    minHeight: Layout.customize.addGroup.height,
    justifyContent: 'center',
    borderRadius: Layout.customize.addGroup.height / 2,
    borderWidth: Layout.customize.addGroup.border,
    borderStyle: 'dashed',
  },
  center: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  bottom: {
    position: 'absolute',
    start: Layout.customize.bar.inset,
    end: Layout.customize.bar.inset,
    gap: Layout.customize.bar.gap,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
  },
});
