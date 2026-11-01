import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionLabel } from '@/components/ui/section-label';
import { Layout } from '@/constants/theme';
import type { HiveModule } from '@/modules/registry';

import type { HomeGroup } from '../home-groups';

/** A group shows its first four apps; the rest are in the group sheet (#30). */
const TILES = 4;

/**
 * App Library-style group card: up to four app tiles in a 2×2 grid, the group name under it
 * (Main.dc.html). Opening the group comes with the group sheet (#30).
 */
export function GroupCard({ group }: { group: HomeGroup<HiveModule> }) {
  const names = group.apps.map((app) => app.title).join(', ');

  return (
    <View style={styles.item}>
      <View accessible aria-label={`${group.name}: ${names}`} testID={`home-group-${group.id}`}>
        <GlassCard style={styles.card} testID={`home-group-${group.id}-card`}>
          <View style={styles.tiles}>
            {group.apps.slice(0, TILES).map((app) => (
              // Temporary until the group sheet (#30): a tile opens its app. Remove with #30.
              <Link key={app.id} href={app.href} asChild>
                <Pressable testID={`home-open-${app.id}`}>
                  <AppIcon
                    tint={app.tint}
                    icon={app.icon}
                    label={app.title}
                    testID={`home-app-${app.id}`}
                  />
                </Pressable>
              </Link>
            ))}
          </View>
        </GlassCard>
      </View>
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
});
