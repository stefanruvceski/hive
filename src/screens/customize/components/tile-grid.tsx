import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Layout, MaxContentWidth } from '@/constants/theme';

/**
 * Four card icons across a Customize section (Customize.dc.html), fewer on a narrow window; the
 * columns spread to the section's edges and a short row stays on the left.
 */
export function TileGrid({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const icon = Layout.icon.card.size;
  const inner =
    Math.min(width, MaxContentWidth) -
    2 * (Layout.screenMargin + Layout.customize.section.paddingHorizontal);
  const fits = Math.floor((inner + Layout.cardPadding) / (icon + Layout.cardPadding));
  const columns = Math.max(1, Math.min(4, fits));
  const columnGap = columns > 1 ? (inner - columns * icon) / (columns - 1) : 0;

  return <View style={[styles.grid, { columnGap }]}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Layout.cardPadding,
  },
});
