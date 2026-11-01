import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Blur, Layout, MaxContentWidth } from '@/constants/theme';
import { useAppUsage, useRecordAppOpen } from '@/hooks/use-app-usage';
import { useHomeLayout } from '@/hooks/use-home-layout';
import { useTheme, useThemeEffects } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { defaultHomeGroups, type HiveModule, hiveModules } from '@/modules/registry';
import { rankByUsage } from '@/utils/app-usage';
import { arrangeHome, findGroup, type HomeGroup } from '@/utils/home-groups';

import { FolderApp } from './components/folder-app';

/**
 * A group opened from the fourth spot of its Home card (docs/design/canvas/GroupSheet.dc.html), like
 * an App Library folder: Home blurred and dimmed behind, the group's name, every app in a grid (most
 * used first) and "Edit group". A tap on the dimmed Home closes it.
 */
export function GroupFolder({ groupId }: { groupId: string }) {
  const insets = useSafeAreaInsets();
  const { data, error, isError, refetch } = useHomeLayout();
  const group = data ? findGroup(arrangeHome(hiveModules, data, defaultHomeGroups), groupId) : null;
  const close = () => router.back();

  // Four states, data first (07 §1). The layout is local, so "error" means the database failed.
  let body;
  if (data && group) body = <FolderContent group={group} />;
  else if (data) {
    body = (
      <EmptyState
        title="Nothing to show here"
        description="This group's apps were moved, pinned to the Dock or hidden."
        action={<PrimaryButton label="Close" onPress={close} testID="group-folder-missing-close" />}
        testID="group-folder-missing"
      />
    );
  } else if (isError) {
    body = <ErrorState error={error} onRetry={() => void refetch()} testID="group-folder-error" />;
  } else body = <LoadingState testID="group-folder-loading" />;

  return (
    <View aria-modal onAccessibilityEscape={close} style={styles.container} testID="group-folder">
      <Backdrop />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + Layout.folder.gap,
            paddingBottom: insets.bottom + Layout.folder.gap,
          },
        ]}>
        <Pressable
          role="button"
          aria-label={group ? `Close ${group.name}` : 'Close'}
          onPress={close}
          style={StyleSheet.absoluteFill}
          testID="group-folder-close"
        />
        <View pointerEvents="box-none" style={styles.content}>
          {body}
        </View>
      </ScrollView>
    </View>
  );
}

/** Home behind the folder: blurred and dimmed on iOS; Android can't blur another screen, so it dims more. */
function Backdrop() {
  const theme = useTheme();
  const effects = useThemeEffects();
  const blurs = Platform.OS === 'ios';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {blurs && (
        <BlurView tint={effects.blurTint} intensity={Blur.glass} style={StyleSheet.absoluteFill} />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: blurs ? theme.folderDim : theme.folderDimSolid },
        ]}
      />
    </View>
  );
}

/** Columns and the gap between them: four card icons across, fewer on a narrow window. */
function useGrid() {
  const { width } = useWindowDimensions();
  const icon = Layout.icon.card.size;
  const inner =
    Math.min(width, MaxContentWidth) - 2 * (Layout.screenMargin + Layout.folder.padding.horizontal);
  const fits = Math.floor(
    (inner + Layout.folder.minColumnGap) / (icon + Layout.folder.minColumnGap),
  );
  const columns = Math.max(1, Math.min(Layout.folder.columns, fits));
  return { columnGap: columns > 1 ? (inner - columns * icon) / (columns - 1) : 0 };
}

function FolderContent({ group }: { group: HomeGroup<HiveModule> }) {
  const theme = useTheme();
  const today = useToday();
  const usage = useAppUsage().data ?? [];
  const recordOpen = useRecordAppOpen();
  const { columnGap } = useGrid();

  // Close the folder first, then open the app: the stack is Home → app, so Back returns to Home.
  const openApp = (app: HiveModule) => {
    recordOpen.mutate({ moduleId: app.id, today });
    router.dismiss();
    router.navigate(app.href);
  };

  return (
    <>
      <ThemedText type="title" role="heading" style={styles.title} testID="group-folder-title">
        {group.name}
      </ThemedText>
      <GlassCard variant="sheet" style={styles.panel} testID="group-folder-apps">
        <View style={[styles.grid, { columnGap }]}>
          {rankByUsage(group.apps, usage, today).map((app) => (
            <FolderApp key={app.id} app={app} onOpen={openApp} />
          ))}
        </View>
      </GlassCard>
      {/* Customize Home at this group (#31). Close the folder first: a screen opened over a
          modal is presented inside it on iOS (agent-rules/02 §6). */}
      <Pressable
        role="button"
        aria-label="Edit group"
        onPress={() => {
          router.dismiss();
          router.navigate({ pathname: '/customize', params: { group: group.id } });
        }}
        hitSlop={(Layout.minTouchAndroid - Layout.minTouch) / 2}
        testID="group-folder-edit">
        {({ pressed }) => (
          <GlassSurface kind="control" radius={Layout.minTouch / 2} style={styles.edit}>
            <View style={[styles.editContent, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                size={Layout.folder.edit.glyph}
                tintColor={theme.accentText}
              />
              <ThemedText type="button" themeColor="accentText">
                Edit group
              </ThemedText>
            </View>
          </GlassSurface>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.folder.gap,
    paddingHorizontal: Layout.screenMargin,
  },
  title: {
    textAlign: 'center',
  },
  panel: {
    alignSelf: 'stretch',
    paddingVertical: Layout.folder.padding.vertical,
    paddingHorizontal: Layout.folder.padding.horizontal,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Layout.folder.rowGap,
  },
  edit: {
    minHeight: Layout.minTouch,
    justifyContent: 'center',
    paddingHorizontal: Layout.folder.edit.paddingHorizontal,
  },
  editContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.folder.edit.gap,
  },
  // Pressed feedback on the content, never on the glass (agent-rules/03 §1).
  pressed: {
    opacity: 0.6,
  },
});
