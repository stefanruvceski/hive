import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useThemeEffects } from '@/hooks/use-theme';
import { defaultHomeGroups, type HiveModule, hiveModules } from '@/modules/registry';

import { Dock } from './components/dock';
import { GroupCard } from './components/group-card';
import { HomeEmpty } from './components/home-empty';
import { HomeHeader } from './components/home-header';
import { arrangeHome, type HomeGroup } from './home-groups';
import { useHomeLayout } from './use-home-layout';

/**
 * Hive's launcher (docs/design/canvas/Main.dc.html): a fixed header, the user's app groups as
 * cards that scroll under it, and the Dock with pinned apps.
 */
export function Home() {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const now = useNow();

  return (
    <Wallpaper style={styles.container}>
      <HomeContent
        headerHeight={headerHeight}
        dockBottom={Math.max(insets.bottom, Layout.dock.bottom)}
      />
      <HomeHeader
        now={now}
        top={insets.top + Layout.home.headerTop}
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
      />
    </Wallpaper>
  );
}

type ContentProps = { headerHeight: number; dockBottom: number };

// Four states, data first (07 §1). The layout is local, so "error" means the database failed.
function HomeContent({ headerHeight, dockBottom }: ContentProps) {
  const { data, error, isError, refetch } = useHomeLayout();

  if (data) {
    const view = arrangeHome(hiveModules, data, defaultHomeGroups);
    if (view.state !== 'apps') {
      return (
        <View style={[styles.container, { paddingTop: headerHeight }]}>
          <HomeEmpty reason={view.state} />
        </View>
      );
    }
    return (
      <AppsLayout
        groups={view.groups}
        pinned={view.pinned}
        headerHeight={headerHeight}
        dockBottom={dockBottom}
      />
    );
  }
  const offset = { paddingTop: headerHeight };
  if (isError) {
    return (
      <View style={[styles.container, offset]}>
        <ErrorState error={error} onRetry={() => void refetch()} testID="home-error" />
      </View>
    );
  }
  return (
    <View style={[styles.container, offset]}>
      <LoadingState testID="home-loading" />
    </View>
  );
}

type AppsProps = ContentProps & {
  groups: HomeGroup<HiveModule>[];
  pinned: HiveModule[];
};

/** Group cards scroll under the header and the Dock, fading out under both. */
function AppsLayout({ groups, pinned, headerHeight, dockBottom }: AppsProps) {
  const effects = useThemeEffects();
  const { width } = useWindowDimensions();
  // Two 169 pt columns on a phone; more where the window (capped at MaxContentWidth) has room.
  const room = Math.min(width, MaxContentWidth) - 2 * Layout.screenMargin + Layout.gridGapAcross;
  const columns = Math.max(2, Math.floor(room / (Layout.card + Layout.gridGapAcross)));
  const gridWidth = columns * Layout.card + (columns - 1) * Layout.gridGapAcross;

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Layout.home.sectionGap,
            paddingBottom: Layout.home.scrimBottom,
          },
        ]}
        testID="home-scroll">
        <View aria-label="Apps" style={[styles.grid, { width: gridWidth }]} testID="home-groups">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </View>
      </ScrollView>
      <View
        pointerEvents="none"
        style={[
          styles.scrimTop,
          { height: headerHeight + Layout.home.scrimTopExtra, backgroundImage: effects.scrimTop },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.scrimBottom, { backgroundImage: effects.scrimBottom }]}
      />
      <Dock pinned={pinned} bottom={dockBottom} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Layout.gridGapAcross,
    rowGap: Layout.gridGapDown,
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    height: Layout.home.scrimBottom,
  },
});
