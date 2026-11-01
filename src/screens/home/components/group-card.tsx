import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionLabel } from '@/components/ui/section-label';
import { Layout } from '@/constants/theme';
import type { HiveModule } from '@/modules/registry';
import type { HomeGroup } from '@/utils/home-groups';

/** A group shows its first four apps; all of them are in the group sheet. */
const TILES = 4;

/**
 * App Library-style group card: up to four app tiles in a 2×2 grid, the group name under it
 * (Main.dc.html). The whole card is one button that opens the group sheet (GroupSheet.dc.html).
 */
export function GroupCard({ group }: { group: HomeGroup<HiveModule> }) {
  const names = group.apps.map((app) => app.title).join(', ');

  return (
    <View style={styles.item}>
      <Pressable
        role="button"
        aria-label={`${group.name}: ${names}`}
        onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
        testID={`home-group-${group.id}`}>
        {({ pressed }) => (
          <GlassCard style={styles.card} testID={`home-group-${group.id}-card`}>
            {/* Pressed fades the tiles, never the glass (iOS stops blurring under opacity). */}
            <View style={[styles.tiles, pressed && styles.pressed]}>
              {group.apps.slice(0, TILES).map((app) => (
                <AppIcon
                  key={app.id}
                  tint={app.tint}
                  icon={app.icon}
                  label={app.title}
                  testID={`home-app-${app.id}`}
                />
              ))}
            </View>
          </GlassCard>
        )}
      </Pressable>
      <SectionLabel variant="group" testID={`home-group-${group.id}-name`}>
        {group.name}
      </SectionLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    width: Layout.card,
    alignItems: 'center',
    gap: Layout.groupLabelGap,
  },
  card: {
    width: Layout.card,
    height: Layout.card,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.cardPadding,
  },
  pressed: {
    opacity: 0.6,
  },
});
