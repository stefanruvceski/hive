import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Wallpaper } from '@/components/ui/wallpaper';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { AppInfoCard } from './components/app-info-card';

export function Settings() {
  return (
    <Wallpaper style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <ThemedText type="body" themeColor="textQuaternary" testID="settings-about">
          ABOUT
        </ThemedText>
        <AppInfoCard />
      </ScrollView>
    </Wallpaper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
