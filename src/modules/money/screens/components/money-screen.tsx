import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Wallpaper } from '@/components/ui/wallpaper';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';

type Props = {
  /** Prefix of the test ids: `<id>-screen`, `<id>-back`, `<id>-title`. */
  id: string;
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
};

/** The frame every Money detail screen shares: wallpaper, safe areas, header and a scrolling body. */
export function MoneyScreen({ id, title, trailing, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Wallpaper style={styles.container} testID={`${id}-screen`}>
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.container}>
        <View style={styles.width}>
          <ScreenHeader
            title={title}
            onBack={() => router.back()}
            backTestID={`${id}-back`}
            titleTestID={`${id}-title`}
            trailing={trailing}
          />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.width,
            styles.content,
            { paddingBottom: insets.bottom + Spacing.five },
          ]}
          testID={`${id}-content`}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </Wallpaper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  width: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenMargin,
  },
  content: { gap: Layout.sectionGap },
});
