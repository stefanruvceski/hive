import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout, MaxContentWidth } from '@/constants/theme';
import { useHomeLayout } from '@/hooks/use-home-layout';
import { useTheme } from '@/hooks/use-theme';
import { defaultHomeGroups, type HiveModule, hiveModules } from '@/modules/registry';
import { arrangeHome, findGroup, type HomeGroup } from '@/utils/home-groups';

import { SheetAppRow } from './components/sheet-app-row';
import { SheetGrabber } from './components/sheet-grabber';
import { SheetHeader } from './components/sheet-header';

/**
 * A group opened from Home (docs/design/canvas/GroupSheet.dc.html), presented as a native sheet:
 * the group's name, how many apps it has, every app with its description, and "Edit group".
 */
export function GroupSheet({ groupId }: { groupId: string }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, Layout.sheet.padding.bottom) },
      ]}
      testID="group-sheet">
      <SheetGrabber />
      <SheetBody groupId={groupId} />
    </ScrollView>
  );
}

// Four states, data first (07 §1). The layout is local, so "error" means the database failed.
function SheetBody({ groupId }: { groupId: string }) {
  const { data, error, isError, refetch } = useHomeLayout();

  if (data) {
    const group = findGroup(arrangeHome(hiveModules, data, defaultHomeGroups), groupId);
    if (!group) {
      return (
        <EmptyState
          title="Nothing to show here"
          description="This group's apps were moved, pinned to the Dock or hidden."
          action={
            <PrimaryButton
              label="Close"
              onPress={() => router.back()}
              testID="group-sheet-missing-close"
            />
          }
          testID="group-sheet-missing"
        />
      );
    }
    return <GroupContent group={group} />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} testID="group-sheet-error" />;
  }
  return <LoadingState testID="group-sheet-loading" />;
}

// Close the sheet first, then open the app: the stack is Home → app, so Back returns to Home.
// Pushed on top of the sheet, the app would be presented inside it on iOS.
function openApp(app: HiveModule) {
  router.dismiss();
  router.navigate(app.href);
}

function GroupContent({ group }: { group: HomeGroup<HiveModule> }) {
  const theme = useTheme();

  return (
    <>
      <SheetHeader name={group.name} appCount={group.apps.length} />
      <View
        aria-label={`Apps in ${group.name}`}
        style={[styles.list, { backgroundColor: theme.inset, borderColor: theme.separator }]}
        testID="group-sheet-apps">
        {group.apps.map((app, index) => (
          <SheetAppRow key={app.id} app={app} first={index === 0} onOpen={openApp} />
        ))}
      </View>
      {/* Opens Customize Home with #31; until then it is shown dimmed and does nothing. */}
      <Pressable
        role="button"
        aria-label="Edit group"
        disabled
        aria-disabled
        hitSlop={(Layout.minTouchAndroid - Layout.sheet.action.minHeight) / 2}
        style={styles.action}
        testID="group-sheet-edit">
        <View style={[styles.actionContent, styles.dimmed]}>
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            size={Layout.sheet.action.glyph}
            tintColor={theme.accentText}
          />
          <ThemedText type="button" themeColor="accentText">
            Edit group
          </ThemedText>
        </View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Layout.sheet.gap,
    paddingTop: Layout.sheet.padding.top,
    paddingHorizontal: Layout.sheet.padding.horizontal,
  },
  list: {
    borderRadius: Layout.radius.list,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  action: {
    alignSelf: 'flex-start',
    minHeight: Layout.sheet.action.minHeight,
    justifyContent: 'center',
    paddingHorizontal: Layout.sheet.action.padding,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.sheet.action.gap,
  },
  // Same as the Dock's Customize button until #31.
  dimmed: {
    opacity: 0.45,
  },
});
