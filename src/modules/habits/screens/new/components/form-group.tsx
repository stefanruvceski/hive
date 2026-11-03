import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';

type Props = {
  /** Left out when the controls explain themselves (emoji, colors); they keep an accessible name. */
  title?: string;
  children: ReactNode;
  /** Pad the content for a control that is not a full-width row (grid, segmented control). */
  padded?: boolean;
  testID: string;
};

/** A titled glass group on the form, drawn like the Settings list groups (Settings.dc.html). */
export function FormGroup({ title, children, padded = false, testID }: Props) {
  return (
    <View style={styles.group} testID={testID}>
      {title ? (
        <ThemedText type="listHeader" role="heading" style={styles.inset}>
          {title}
        </ThemedText>
      ) : null}
      <GlassSurface
        kind="glass"
        radius={Layout.radius.list}
        style={padded ? styles.padded : styles.list}>
        {children}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  inset: {
    marginHorizontal: Layout.listRow.paddingHorizontal,
  },
  list: {
    overflow: 'hidden',
  },
  padded: {
    padding: Layout.listRow.controlPadding,
  },
});
