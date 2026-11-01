import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionLabel } from '@/components/ui/section-label';
import { Layout } from '@/constants/theme';
import type { HiveModule } from '@/modules/registry';
import { cardTiles, type HomeGroup } from '@/utils/home-groups';
import { countLabel } from '@/utils/plural';

type Props = {
  group: HomeGroup<HiveModule>;
  /** The group's apps, most used first. */
  ranked: readonly HiveModule[];
  onOpen: (app: HiveModule) => void;
};

/** Small icons shown in the fourth spot (2×2). */
const MINIS = 4;

/**
 * App Library-style group card (Main.dc.html), the group name under it. Four apps or fewer: each
 * tile opens its app. More: the three most used stay big and the rest shrink into the fourth spot,
 * which opens the group folder.
 */
export function GroupCard({ group, ranked, onOpen }: Props) {
  const { open, more } = cardTiles(group.apps, ranked);

  return (
    <View style={styles.item} testID={`home-group-${group.id}`}>
      <GlassCard style={styles.card} testID={`home-group-${group.id}-card`}>
        <View style={styles.tiles}>
          {open.map((app) => (
            <Pressable
              key={app.id}
              role="button"
              aria-label={`Open ${app.title}`}
              onPress={() => onOpen(app)}
              testID={`home-open-${app.id}`}>
              {/* Pressed fades the tile, never the glass (iOS stops blurring under opacity). */}
              {({ pressed }) => (
                <View style={pressed && styles.pressed}>
                  <AppIcon
                    tint={app.tint}
                    icon={app.icon}
                    label={app.title}
                    testID={`home-app-${app.id}`}
                  />
                </View>
              )}
            </Pressable>
          ))}
          {more.length > 0 && (
            <Pressable
              role="button"
              aria-label={`${group.name}: show all ${countLabel(group.apps.length, 'app')}`}
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
              testID={`home-group-${group.id}-more`}>
              {({ pressed }) => (
                <View style={[styles.minis, pressed && styles.pressed]}>
                  {more.slice(0, MINIS).map((app) => (
                    <AppIcon
                      key={app.id}
                      tint={app.tint}
                      icon={app.icon}
                      size="mini"
                      label={app.title}
                      testID={`home-mini-${app.id}`}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          )}
        </View>
      </GlassCard>
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
  // Four 30 pt icons in one 65 pt tile: 30 · 5 · 30.
  minis: {
    width: Layout.icon.card.size,
    height: Layout.icon.card.size,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'space-between',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.6,
  },
});
