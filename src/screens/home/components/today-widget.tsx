import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { AppTints, Layout } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';
import type { HiveModule } from '@/modules/registry';
import type { HomeSummary, HomeSummaryResult } from '@/utils/home-summary';

import { ProgressRing } from './progress-ring';

/** A module that has a Today widget. */
export type TodayModule = HiveModule & { useHomeSummary: () => HomeSummaryResult };

type Props = {
  module: TodayModule;
  width: number;
  onOpen: (module: TodayModule) => void;
};

/** What a screen reader says after the app's name. */
function spoken(result: HomeSummaryResult): string {
  if (result.status === 'pending') return 'loading';
  if (result.status === 'error') return 'summary unavailable';
  return result.summary.label;
}

/**
 * One square widget in Home's Today strip (Main.dc.html): the app's glyph and name in its tint over
 * the module's summary. Calls the module's own summary hook; Home renders one per module, keyed by
 * its id, so each always calls the same hook. A summary that is loading or failed shows inside
 * the widget and never holds up the rest of Home; a tap always opens the module.
 */
export function TodayWidget({ module, width, onOpen }: Props) {
  const result = module.useHomeSummary();
  const scheme = useThemeName();

  return (
    <Pressable
      role="button"
      aria-label={`${module.title}: ${spoken(result)}`}
      aria-busy={result.status === 'pending'}
      onPress={() => onOpen(module)}
      style={{ width }}
      testID={`home-today-${module.id}`}>
      {({ pressed }) => (
        <GlassCard style={styles.card} testID={`home-today-${module.id}-card`}>
          {/* Pressed fades the content, never the glass (iOS stops blurring under opacity). */}
          <View style={[styles.content, pressed && styles.pressed]}>
            <View style={styles.label}>
              <SymbolView
                name={module.icon}
                size={Layout.today.labelGlyph}
                tintColor={AppTints[module.tint][scheme]}
              />
              <ThemedText type="label" tint={module.tint}>
                {module.title}
              </ThemedText>
            </View>
            {result.status === 'success' ? (
              <SummaryBody summary={result.summary} module={module} />
            ) : result.status === 'error' ? (
              <ThemedText type="body" themeColor="textSecondary">
                {"Can't show today's summary"}
              </ThemedText>
            ) : (
              <Spinner />
            )}
          </View>
        </GlassCard>
      )}
    </Pressable>
  );
}

function Spinner() {
  const theme = useTheme();
  return <ActivityIndicator style={styles.spinner} color={theme.textSecondary} />;
}

function SummaryBody({ summary, module }: { summary: HomeSummary; module: TodayModule }) {
  if (summary.kind === 'message') {
    return (
      <View style={styles.message}>
        <ThemedText type="headline">{summary.headline}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          {summary.body}
        </ThemedText>
      </View>
    );
  }
  return (
    <View style={styles.progress}>
      <ProgressRing done={summary.done} total={summary.total} tint={module.tint} />
      <View style={styles.count}>
        <ThemedText type="number">
          {summary.done}
          <ThemedText type="body" themeColor="textTertiary">
            /{summary.total}
          </ThemedText>
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          {summary.caption}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Square at default text; taller when its text needs room (never clipped).
  card: {
    minHeight: Layout.card,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: Layout.today.widgetGap,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.today.labelGap,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.today.ringGap,
  },
  count: {
    flex: 1,
  },
  message: {
    gap: Layout.today.messageGap,
  },
  spinner: {
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
});
