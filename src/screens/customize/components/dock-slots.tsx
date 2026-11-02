import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { GlassCard } from '@/components/ui/glass-card';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HiveModule } from '@/modules/registry';
import { MAX_PINNED } from '@/utils/home-groups';

import { Draggable, DropZone } from './draggable';
import { SelectableApp } from './selectable-app';
import { TileGrid } from './tile-grid';

type Props = {
  pinned: readonly HiveModule[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** The Dock in Customize: its pinned apps (selectable) and a dashed slot for each free place. */
export function DockSlots({ pinned, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const free = Array.from({ length: Math.max(0, MAX_PINNED - pinned.length) }, (_, index) => index);

  return (
    <GlassCard edgeColor={theme.accentEdge} style={styles.section} testID="customize-dock">
      <View style={styles.header}>
        <View style={styles.title}>
          <SymbolView
            name={{ ios: 'pin.fill', android: 'push_pin', web: 'push_pin' }}
            size={Layout.customize.headingGlyph}
            tintColor={theme.accentText}
          />
          <ThemedText type="section" themeColor="accentText" role="heading">
            Dock
          </ThemedText>
        </View>
        <ThemedText type="footnote" testID="customize-dock-count">
          {`${pinned.length} of ${MAX_PINNED} pinned`}
        </ThemedText>
      </View>
      <TileGrid>
        {pinned.map((app, slot) => (
          <Draggable
            key={app.id}
            item={{ kind: 'app', moduleId: app.id, pinned: true, fromDock: true }}
            zone={{ type: 'dock', slot }}
            ghost={
              <AppIcon
                tint={app.tint}
                icon={app.icon}
                label={app.title}
                testID={`customize-dock-${app.id}-ghost`}
              />
            }>
            <SelectableApp
              app={app}
              label={`${app.title}, in the Dock`}
              selected={selectedId === app.id}
              onPress={() => onSelect(app.id)}
              testID={`customize-dock-${app.id}`}
            />
          </Draggable>
        ))}
        {free.map((index) => (
          <DropZone key={index} zone={{ type: 'dock', slot: pinned.length + index }}>
            <View
              aria-hidden
              style={[styles.slot, { borderColor: theme.dashedSlot }]}
              testID={`customize-dock-empty-${index}`}
            />
          </DropZone>
        ))}
      </TileGrid>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Layout.customize.section.gap,
    paddingTop: Layout.customize.section.paddingTop,
    paddingHorizontal: Layout.customize.section.paddingHorizontal,
    paddingBottom: Layout.customize.section.paddingBottom,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: Spacing.two,
    paddingHorizontal: Layout.customize.section.titleInset,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.customize.titleGap,
  },
  slot: {
    width: Layout.icon.card.size,
    height: Layout.icon.card.size,
    borderRadius: Layout.icon.card.radius,
    borderWidth: Layout.home.slotBorder,
    borderStyle: 'dashed',
  },
});
