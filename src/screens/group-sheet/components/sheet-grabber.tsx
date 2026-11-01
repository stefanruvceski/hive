import { Platform, StyleSheet, View } from 'react-native';

import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The design's grabber. iOS draws its own (`sheetGrabberVisible`), so there it only keeps the space
 * free; Android's sheet has none, so it is drawn. Decorative: hidden from screen readers.
 */
export function SheetGrabber() {
  const theme = useTheme();

  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      testID="group-sheet-grabber"
      style={[
        styles.grabber,
        { backgroundColor: Platform.OS === 'android' ? theme.grabber : theme.clear },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  grabber: {
    alignSelf: 'center',
    width: Layout.sheet.grabber.width,
    height: Layout.sheet.grabber.height,
    borderRadius: Layout.sheet.grabber.radius,
  },
});
