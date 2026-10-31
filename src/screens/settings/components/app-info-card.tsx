import { isApiConfigured } from '@/lib/api';
import { getAppInfo } from '@/lib/app-info';

import { useHealth } from '../use-health';
import { SettingsGroup } from './settings-group';
import { SettingsRow } from './settings-row';

const info = getAppInfo();

const rows: { label: string; value: string; code?: boolean; testID: string }[] = [
  { label: 'Variant', value: info.variant, testID: 'app-info-variant' },
  { label: 'Version', value: info.version, testID: 'app-info-version' },
  { label: 'Runtime', value: info.runtimeVersion, code: true, testID: 'app-info-runtime' },
  { label: 'Channel', value: info.updateChannel, testID: 'app-info-channel' },
  {
    label: 'Update',
    value: info.isEmbeddedLaunch ? 'embedded' : info.updateId,
    code: true,
    testID: 'app-info-update',
  },
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

  return <SettingsRow label="Server" value={serverValue} testID="app-info-server" />;
}

/** Build and OTA metadata. Keep it reachable in production — it makes bug reports actionable. */
export function AppInfoCard() {
  return (
    <SettingsGroup title="About" testID="app-info-card" titleTestID="settings-about">
      {rows.map((row) => (
        <SettingsRow
          key={row.label}
          label={row.label}
          value={row.value}
          valueType={row.code ? 'code' : 'row'}
          testID={row.testID}
        />
      ))}
      {isApiConfigured() && <ServerRow />}
    </SettingsGroup>
  );
}
