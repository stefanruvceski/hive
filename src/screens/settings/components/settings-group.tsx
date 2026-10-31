import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  /** Explanation under the group. */
  footnote?: string;
  /** Rows, separated by hairlines. Pass `padded` for one control that is not a row. */
  children: ReactNode;
  padded?: boolean;
  testID: string;
  /** testID of the header text; defaults to `${testID}-title`. */
  titleTestID?: string;
};

/** A titled glass list group from the Settings design: header, rows with separators, footnote. */
export function SettingsGroup({
  title,
  footnote,
  children,
  padded = false,
  testID,
  titleTestID = `${testID}-title`,
}: Props) {
  const theme = useTheme();
  const rows = Children.toArray(children);

  return (
    <View style={styles.group} testID={testID}>
      <ThemedText type="listHeader" role="heading" style={styles.inset} testID={titleTestID}>
        {title}
      </ThemedText>
      <GlassSurface
        kind="glass"
        radius={Layout.radius.list}
        style={padded ? styles.padded : styles.list}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 && <View style={[styles.separator, { backgroundColor: theme.separator }]} />}
            {row}
          </Fragment>
        ))}
      </GlassSurface>
      {footnote && (
        <ThemedText type="footnote" style={[styles.inset, styles.footnote]}>
          {footnote}
        </ThemedText>
      )}
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
    padding: Layout.cardPadding,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginStart: Layout.listRow.paddingHorizontal,
  },
  footnote: {
    marginTop: Spacing.half,
  },
});
