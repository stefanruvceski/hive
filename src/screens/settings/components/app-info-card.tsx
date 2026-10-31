import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAppInfo } from '@/lib/app-info';

import { useHealth } from '../use-health';

const info = getAppInfo();

const rows: [label: string, value: string][] = [
  ['Variant', info.variant],
  ['Version', info.version],
  ['Runtime', info.runtimeVersion],
  ['Channel', info.updateChannel],
  ['Update', info.isEmbeddedLaunch ? 'embedded' : info.updateId],
];

/** Build and OTA metadata. Keep it reachable in production — it makes bug reports actionable. */
export function AppInfoCard() {
  const health = useHealth();
  // Inline three-state row — background info, not core content (agent-rules/14 §2).
  const serverValue = health.isPending
    ? 'checking…'
    : health.isError
      ? 'unreachable'
      : health.data.status;

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID="app-info-card">
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <ThemedText type="small">{label}</ThemedText>
          <ThemedText type="code" themeColor="textSecondary" numberOfLines={1}>
            {value}
          </ThemedText>
        </View>
      ))}
      <View style={styles.row}>
        <ThemedText type="small">Server</ThemedText>
        <ThemedText
          type="code"
          themeColor="textSecondary"
          numberOfLines={1}
          testID="app-info-server">
          {serverValue}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
