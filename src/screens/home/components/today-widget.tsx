import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { AppTints, Layout } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';
import type { HiveModule } from '@/modules/registry';
import { type HomeSummary, type HomeSummaryResult, visibleUpNext } from '@/utils/home-summary';

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
 * One square widget in Home's Today strip (Main.dc.html, changed in the #33 review): the app's glyph
 * and name in its tint, a small progress ring with done/total at the end of that row, and the things
 * still to do under it. Calls the module's own summary hook; Home renders one per module, keyed by
 * its id, so each always calls the same hook. A summary that is loading or failed shows inside
 * the widget and never holds up the rest of Home; a tap always opens the module.
 */
export function TodayWidget({ module, width, onOpen }: Props) {
  const result = module.useHomeSummary();
  const scheme = useThemeName();
  const summary = result.status === 'success' ? result.summary : null;

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
            <View style={styles.header}>
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
              {summary?.kind === 'progress' && (
                <View style={styles.count}>
                  <ProgressRing done={summary.done} total={summary.total} tint={module.tint} />
                  <ThemedText type="label" themeColor="textSecondary">
                    {`${summary.done}/${summary.total}`}
                  </ThemedText>
                </View>
              )}
              {summary?.kind === 'message' && summary.ring && (
                <View style={styles.count}>
                  <ProgressRing done={summary.ring.share} total={1} tint={module.tint} />
                  <ThemedText type="label" themeColor="textSecondary">
                    {summary.ring.text}
                  </ThemedText>
                </View>
              )}
            </View>
            {summary ? (
              <SummaryBody summary={summary} />
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

function SummaryBody({ summary }: { summary: HomeSummary }) {
  if (summary.kind === 'message') {
    return (
      <View style={styles.messageWrap}>
        <View style={styles.message}>
          {summary.caption ? (
            <ThemedText type="footnote" themeColor="textTertiary">
              {summary.caption}
            </ThemedText>
          ) : null}
          <ThemedText type="headline" style={summary.caption ? styles.headline : undefined}>
            {summary.headline}
          </ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            {summary.body}
          </ThemedText>
        </View>
        {summary.footnote ? (
          <ThemedText type="footnote" themeColor="textTertiary" style={styles.footnote}>
            {summary.footnote}
          </ThemedText>
        ) : null}
      </View>
    );
  }
  if (summary.upNext.length === 0) {
    return <ThemedText type="headline">All done today</ThemedText>;
  }
  const { shown, more } = visibleUpNext(summary.upNext);
  return (
    <View style={styles.list}>
      {shown.map((item) => (
        <View key={item.id} style={styles.item}>
          <ThemedText type="body">{item.icon}</ThemedText>
          <ThemedText type="body" themeColor="textSecondary" style={styles.itemName}>
            {item.name}
          </ThemedText>
        </View>
      ))}
      {more > 0 && (
        <ThemedText type="body" themeColor="textTertiary">
          {`+${more} more`}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Square at default text; taller when its text needs room (never clipped).
  card: {
    minHeight: Layout.card,
  },
  // The list starts right under the header row.
  content: {
    flexGrow: 1,
    gap: Layout.today.widgetGap,
  },
  // App name at the start, the progress ring and count at the end.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Layout.today.inlineGap,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.today.labelGap,
    flexShrink: 1,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.today.inlineGap,
  },
  list: {
    gap: Layout.today.listGap,
  },
  item: {
    flexDirection: 'row',
    gap: Layout.today.inlineGap,
  },
  // Wraps at large text sizes, never truncates.
  itemName: {
    flex: 1,
  },
  messageWrap: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  message: {
    gap: Layout.today.messageGap,
  },
  // The caption stands apart from the number.
  headline: {
    marginTop: Layout.today.captionGap,
  },
  // The unit sits at the bottom end, small, not inside the number.
  footnote: {
    alignSelf: 'flex-end',
  },
  spinner: {
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
});
