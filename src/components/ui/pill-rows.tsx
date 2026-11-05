import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

/** Past this many rows the pills scroll sideways instead of growing the form downwards. */
export const DEFAULT_MAX_ROWS = 2;

export type Pill = { key: string; node: ReactNode };

/**
 * A list of pills that wraps onto at most `maxRows` rows (two by default). When they would need
 * more, they sit in that many rows that scroll sideways. The rows are counted from where the wrapped pills actually land, so
 * large text and long labels are handled like any other width.
 */
export function PillRows({
  pills,
  maxRows = DEFAULT_MAX_ROWS,
}: {
  pills: readonly Pill[];
  maxRows?: number;
}) {
  // A different set of pills starts counting again.
  return <Counted key={pills.map((pill) => pill.key).join('|')} pills={pills} maxRows={maxRows} />;
}

function Counted({ pills, maxRows }: { pills: readonly Pill[]; maxRows: number }) {
  const [tops, setTops] = useState<Record<string, number>>({});
  const rows = new Set(Object.values(tops)).size;

  if (rows > maxRows) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="pill-rows-scroll">
        <View style={styles.rows}>
          {Array.from({ length: maxRows }, (_, row) => (
            <View key={row} style={styles.line}>
              {pills.filter((_, i) => i % maxRows === row).map((pill) => pill.node)}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }
  return (
    <View style={styles.wrap}>
      {pills.map((pill) => (
        <View
          key={pill.key}
          onLayout={(event) => {
            const top = Math.round(event.nativeEvent.layout.y);
            setTops((known) => (known[pill.key] === top ? known : { ...known, [pill.key]: top }));
          }}>
          {pill.node}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  rows: { gap: Spacing.two },
  line: { flexDirection: 'row', gap: Spacing.two },
});
