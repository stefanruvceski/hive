import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { Layout, Spacing } from '@/constants/theme';
import { countLabel } from '@/utils/plural';

type Props = { name: string; appCount: number };

/** The group's name, how many apps it holds, and Close (GroupSheet.dc.html). */
export function SheetHeader({ name, appCount }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.text}>
        <ThemedText type="sheetTitle" role="heading" testID="group-sheet-title">
          {name}
        </ThemedText>
        <ThemedText type="body" themeColor="textQuaternary" testID="group-sheet-count">
          {countLabel(appCount, 'app')}
        </ThemedText>
      </View>
      <GlassButton
        icon={{ ios: 'xmark', android: 'close', web: 'close' }}
        label="Close"
        onPress={() => router.back()}
        testID="group-sheet-close"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.gridGapAcross,
    paddingHorizontal: Layout.sheet.headerInset,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
