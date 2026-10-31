import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** `all-hidden`: every app is hidden (Empty.dc.html). `no-modules`: no app exists yet. */
  reason: 'all-hidden' | 'no-modules';
};

const copy = {
  'all-hidden': {
    title: 'Your Home is empty',
    body: 'Every app is hidden. Bring the ones you use back to Home — their data is still here.',
  },
  'no-modules': {
    title: 'No apps yet',
    body: 'Apps show up here as they are added.',
  },
} as const;

/** Home with nothing to show: an empty group card, the reason and, when apps are hidden, Customize. */
export function HomeEmpty({ reason }: Props) {
  const theme = useTheme();
  const { title, body } = copy[reason];
  const slots = [theme.dashedSlot, theme.dashedSlot, theme.dashedSlot, theme.accent];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID={reason === 'all-hidden' ? 'home-all-hidden' : 'home-empty'}>
      <View aria-hidden importantForAccessibility="no-hide-descendants">
        <GlassCard style={styles.card} testID="home-empty-card">
          <View style={styles.tiles}>
            {slots.map((color, index) => (
              <View key={index} style={[styles.slot, { borderColor: color }]} />
            ))}
          </View>
        </GlassCard>
      </View>
      <ThemedText role="heading" type="stateTitle" style={[styles.center, styles.title]}>
        {title}
      </ThemedText>
      <ThemedText type="stateBody" style={[styles.center, styles.body]}>
        {body}
      </ThemedText>
      {reason === 'all-hidden' && (
        // Customize Home opens with #31; until then the button is shown but does nothing.
        <View style={styles.action}>
          <PrimaryButton
            label="Customize Home"
            onPress={() => {}}
            disabled
            testID="home-empty-customize"
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Layout.screenMargin + Layout.gridGapAcross,
    paddingBottom: Layout.home.emptyBottom,
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
  slot: {
    width: Layout.icon.card.size,
    height: Layout.icon.card.size,
    borderRadius: Layout.icon.card.radius,
    borderWidth: Layout.home.slotBorder,
    borderStyle: 'dashed',
  },
  center: {
    textAlign: 'center',
  },
  title: {
    marginTop: Spacing.one,
  },
  body: {
    maxWidth: Layout.home.emptyTextMaxWidth,
  },
  action: {
    marginTop: Spacing.one,
  },
});
