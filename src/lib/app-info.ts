import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export type AppInfo = {
  name: string;
  version: string;
  variant: string;
  runtimeVersion: string;
  updateChannel: string;
  updateId: string;
  isEmbeddedLaunch: boolean;
};

/** Build/update metadata — useful on an About/Debug screen and in bug reports. */
export function getAppInfo(): AppInfo {
  return {
    name: Constants.expoConfig?.name ?? 'unknown',
    version: Constants.expoConfig?.version ?? 'unknown',
    variant: String(Constants.expoConfig?.extra?.variant ?? 'development'),
    runtimeVersion: Updates.runtimeVersion ?? 'n/a',
    // Dev builds report an empty string, not null — `||` covers both.
    updateChannel: Updates.channel || 'local',
    updateId: Updates.updateId ?? 'embedded',
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
