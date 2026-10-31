import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { KeyValueRow } from '@/components/ui/key-value-row';
import { Spacing } from '@/constants/theme';
import { isApiConfigured } from '@/lib/api';
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

/** Server reachability. Rendered only when an API URL is configured — Hive is local-first. */
function ServerRow() {
  const health = useHealth();
  // Inline three-state row — background info, not core content (agent-rules/14 §2).
  const serverValue = health.isPending
    ? 'checking…'
    : health.isError
      ? 'unreachable'
      : health.data.status;

  return <KeyValueRow label="Server" value={serverValue} testID="app-info-server" />;
}

/** Build and OTA metadata. Keep it reachable in production — it makes bug reports actionable. */
export function AppInfoCard() {
  return (
    <ThemedView type="backgroundElement" style={styles.card} testID="app-info-card">
      {rows.map(([label, value]) => (
        <KeyValueRow key={label} label={label} value={value} />
      ))}
      {isApiConfigured() && <ServerRow />}
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
});
