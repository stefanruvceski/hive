import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { HabitColors, Spacing } from '@/constants/theme';
import { useThemeName } from '@/hooks/use-theme';

import type { PricePoint } from '../../domain/price-book';
import { chartSeries } from '../../domain/price-chart';
import { formatAmount } from '../../domain/receipt-stats';

const HEIGHT = 140;
const PAD = 8;

/** Price over time: one line per shop (a legend names them), highest price at the top. */
export function PriceChart({
  history,
  testID,
}: {
  history: readonly PricePoint[];
  testID: string;
}) {
  const [width, setWidth] = useState(0);
  const mode = useThemeName();
  const { series, min, max } = chartSeries(history, Math.max(width - PAD * 2, 0), HEIGHT - PAD * 2);
  const color = (i: number) => {
    const c = HabitColors[(i * 3) % HabitColors.length] ?? HabitColors[0];
    return c[mode === 'dark' ? 'dark' : 'light'];
  };
  const first = history.reduce((a, p) => (p.date < a ? p.date : a), history[0]?.date ?? '');
  const last = history.reduce((a, p) => (p.date > a ? p.date : a), first);
  return (
    <View
      style={styles.box}
      testID={testID}
      accessible
      accessibilityLabel={`Price chart, ${series.length} shops, from ${formatAmount(min)} to ${formatAmount(max)}`}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.plot}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {series.map((s, i) => {
              const pts = s.points.map((p) => `${p.x + PAD},${p.y + PAD}`).join(' ');
              return (
                <G key={s.shopKey}>
                  {s.points.length > 1 ? (
                    <Polyline points={pts} fill="none" stroke={color(i)} strokeWidth={2} />
                  ) : null}
                  {s.points.map((p) => (
                    <Circle key={p.date} cx={p.x + PAD} cy={p.y + PAD} r={3.5} fill={color(i)} />
                  ))}
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        <ThemedText type="footnote">{first}</ThemedText>
        <ThemedText type="footnote">{last}</ThemedText>
      </View>
      <View style={styles.legend}>
        {series.map((s, i) => (
          <ThemedText key={s.shopKey} type="footnote" style={{ color: color(i) }}>
            ● {s.shop}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.one },
  plot: { height: HEIGHT },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
});
