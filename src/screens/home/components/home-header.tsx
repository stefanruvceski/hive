import { router } from 'expo-router';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { Layout, Spacing } from '@/constants/theme';

import { dateLine, greeting } from '../greeting';

type Props = {
  now: Date;
  /** Distance from the screen top (safe area + design offset). */
  top: number;
  /** Reports the header's height so content can start under it. */
  onLayout?: (event: LayoutChangeEvent) => void;
};

/** Home's fixed header: date line, greeting and the Settings button (Main.dc.html). */
export function HomeHeader({ now, top, onLayout }: Props) {
  return (
    <View style={[styles.header, { paddingTop: top }]} onLayout={onLayout}>
      <View style={styles.text}>
        <ThemedText type="date" testID="home-date">
          {dateLine(now)}
        </ThemedText>
        <ThemedText type="title" role="heading" testID="home-title">
          {greeting(now)}
        </ThemedText>
      </View>
      <GlassButton
        icon={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
        label="Settings"
        onPress={() => router.push('/settings')}
        testID="home-settings"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed over the content, which scrolls under it.
  header: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Layout.gridGapAcross,
    paddingHorizontal: Layout.screenMargin,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
