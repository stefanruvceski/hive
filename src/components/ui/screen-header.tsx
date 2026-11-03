import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { Layout, Spacing } from '@/constants/theme';

export type ScreenHeaderProps = {
  title: string;
  onBack: () => void;
  backTestID: string;
  titleTestID: string;
  /** Controls beside the title that change what it shows (previous / next month). */
  titleStart?: ReactNode;
  titleEnd?: ReactNode;
  /** An action at the end of the row (Save); the title stays centered on the screen. */
  trailing?: ReactNode;
};

/**
 * Header of a detail screen, the same on iOS and Android (Apple HIG navigation bar): the round Back
 * button at the start and a small title centered on the screen in the same row.
 */
export function ScreenHeader({
  title,
  onBack,
  backTestID,
  titleTestID,
  titleStart,
  titleEnd,
  trailing,
}: ScreenHeaderProps) {
  // Both sides are as wide as the wider one, so the title is centered on the screen.
  const side = trailing ? TRAILING_WIDTH : Layout.control.size;
  return (
    <View style={styles.header}>
      <View style={{ minWidth: side }}>
        <GlassButton
          icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          label="Back"
          onPress={onBack}
          testID={backTestID}
        />
      </View>
      <View style={styles.center}>
        {titleStart}
        <ThemedText type="section" role="heading" testID={titleTestID}>
          {title}
        </ThemedText>
        {titleEnd}
      </View>
      <View style={[styles.trailing, { minWidth: side }]}>{trailing}</View>
    </View>
  );
}

/** Room for a compact button such as Save at the end. */
const TRAILING_WIDTH = 88;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  trailing: {
    alignItems: 'flex-end',
  },
});
